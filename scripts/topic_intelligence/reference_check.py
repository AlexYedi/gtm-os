#!/usr/bin/env python3
"""
Client-side reference for the topic-intelligence computations (Slice 1 Section A).
Computes trend + co-occurrence + bridges independently (Python over REST pulls), so the
SQL function's output can be diffed against a known-good target — no fabricated numbers.

as_of defaults to the system 'today' passed in; run: python3 reference_check.py [YYYY-MM-DD]
"""
import json, os, sys, urllib.request, urllib.error
from datetime import date, timedelta
from itertools import combinations
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ENV = os.path.join(HERE, "..", "..", ".env")
AS_OF = date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else date(2026, 8, 6)

def env():
    d = {}
    for ln in open(ENV):
        ln = ln.strip()
        if ln and not ln.startswith("#") and "=" in ln:
            k, v = ln.split("=", 1); d[k] = v.strip().strip('"').strip("'")
    return d
E = env(); BASE = E["SUPABASE_SPINE_URL"].rstrip("/") + "/rest/v1"; KEY = E["SUPABASE_SPINE_SERVICE_KEY"]

def get(path):
    r = urllib.request.Request(BASE + path)
    r.add_header("apikey", KEY); r.add_header("Authorization", "Bearer " + KEY); r.add_header("Accept-Profile", "signal")
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read().decode())

# pulls
events   = {e["event_id"]: e["event_date"] for e in get("/events?select=event_id,event_date")}
t2c      = {t["topic_id"]: t["cluster_id"] for t in get("/topics?select=topic_id,cluster_id") if t["cluster_id"]}
cname    = {c["cluster_id"]: c["display_name"] for c in get("/topic_cluster?select=cluster_id,display_name")}
tagged   = get("/relations?select=from_id,to_id&relation_type=eq.tagged_topic&from_type=eq.event&to_type=eq.topic&is_active=eq.true")
speakers = get("/relations?select=from_id,to_id&relation_type=in.(speaker_at,host_of,panelist_at)&from_type=eq.entity&to_type=eq.event&is_active=eq.true")

def d(s): return date.fromisoformat(s)
def in_window(evid, days):
    if days is None: return True
    ed = events.get(evid)
    return ed is not None and d(ed) >= AS_OF - timedelta(days=days)

# cluster -> events (in window); event -> clusters
def cluster_events(days):
    ce = defaultdict(set)
    for r in tagged:
        c = t2c.get(r["to_id"])
        if c and in_window(r["from_id"], days):
            ce[c].add(r["from_id"])
    return ce

WINDOWS = [("month", 30), ("week", 7), ("all_time", None)]

print(f"=== REFERENCE  as_of={AS_OF} ===")
# window staleness diagnostic
print("\n-- events per window (corpus ends 2026-07-17) --")
for wt, dd in WINDOWS:
    n = len({r["from_id"] for r in tagged if in_window(r["from_id"], dd)})
    print(f"  {wt:9s}: {n} events tagged")

# TREND (cluster level)
for wt, dd in WINDOWS:
    ce = cluster_events(dd)
    # prior window
    prior = defaultdict(set)
    if dd is not None:
        for r in tagged:
            c = t2c.get(r["to_id"]); ed = events.get(r["from_id"])
            if c and ed and AS_OF - timedelta(days=2*dd) <= d(ed) < AS_OF - timedelta(days=dd):
                prior[c].add(r["from_id"])
    rows = []
    for c, evs in ce.items():
        ec = len(evs); pc = len(prior[c]) if dd is not None else None
        mom = None if dd is None else (ec - pc) / max(pc, 1)
        if ec < 3: label = "insufficient_data"
        elif dd is None: label = "steady"
        elif pc == 0: label = "new"
        elif mom >= 0.5: label = "heating"
        elif mom <= -0.5: label = "cooling"
        else: label = "steady"
        rows.append((ec, cname.get(c, c[:8]), label, mom))
    if wt in ("month", "all_time"):
        print(f"\n-- TREND [{wt}] (surfaced window) --")
        for ec, nm, lab, mom in sorted(rows, reverse=True)[:12]:
            ms = "" if mom is None else f" mom={mom:+.2f}"
            print(f"  {ec:>3} ev  {lab:17s} {nm}{ms}")

# PAIRS (all_time — the meaningful window given corpus staleness)
ce = cluster_events(None)
ev2c = defaultdict(set)
for c, evs in ce.items():
    for e in evs: ev2c[e].add(c)
pair_ev = defaultdict(set)
for e, cs in ev2c.items():
    for a, b in combinations(sorted(cs), 2): pair_ev[(a, b)].add(e)
# bridges
spk_cluster = defaultdict(set)  # entity -> clusters (all_time)
ev_speakers = defaultdict(set)
for r in speakers:
    ev_speakers[r["to_id"]].add(r["from_id"])
for e, cs in ev2c.items():
    for ent in ev_speakers.get(e, ()):
        for c in cs: spk_cluster[ent].add(c)
pair_bridge = defaultdict(set)
for ent, cs in spk_cluster.items():
    for a, b in combinations(sorted(cs), 2): pair_bridge[(a, b)].add(ent)

allpairs = set(pair_ev) | set(pair_bridge)
scored = []
for p in allpairs:
    co = len(pair_ev.get(p, ())); br = len(pair_bridge.get(p, ()))
    scored.append((co + 2*br, co, br, p))
print(f"\n-- PAIRS [all_time]: {len(allpairs)} intersecting theme-pairs --")
print("  score  cooc  bridge  A × B")
for sc, co, br, (a, b) in sorted(scored, reverse=True)[:12]:
    print(f"  {sc:>5}  {co:>4}  {br:>6}  {cname.get(a,a[:8])} × {cname.get(b,b[:8])}")
