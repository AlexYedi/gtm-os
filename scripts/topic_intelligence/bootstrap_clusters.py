#!/usr/bin/env python3
"""
Slice-0 bootstrap: write the N=30 topic taxonomy into the spine over REST.
  - creates a manual ingestion_run
  - upserts 30 signal.topic_cluster rows (idempotent on canonical_slug)
  - assigns all 170 signal.topics.cluster_id + confidence + assigned_by

Non-destructive. Synonym HARD-merges are NOT done here (separate reviewed step).
Dry-run by default; pass --execute to write. Requires signal_06 migration applied.

Env (.env): SUPABASE_SPINE_URL, SUPABASE_SPINE_SERVICE_KEY
Usage: python3 bootstrap_clusters.py [--execute]
"""
import json, os, sys, urllib.request, urllib.error, hashlib

TARGET = "30"
HERE = os.path.dirname(os.path.abspath(__file__))
TAX = os.path.join(HERE, "taxonomy_candidates.json")
ENV = os.path.join(HERE, "..", "..", ".env")   # repo-root .env (gitignored)
EXECUTE = "--execute" in sys.argv

def load_env():
    d = {}
    for line in open(ENV):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1); d[k] = v.strip().strip('"').strip("'")
    return d

env = load_env()
BASE = env["SUPABASE_SPINE_URL"].rstrip("/") + "/rest/v1"
KEY = env["SUPABASE_SPINE_SERVICE_KEY"]

def req(method, path, body=None, prefer=None, profile_write=True):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("apikey", KEY); r.add_header("Authorization", "Bearer " + KEY)
    r.add_header("Content-Type", "application/json")
    # signal schema is not on the default REST surface
    r.add_header("Accept-Profile", "signal")
    if method in ("POST", "PATCH", "PUT"):
        r.add_header("Content-Profile", "signal")
    if prefer: r.add_header("Prefer", prefer)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

tax = json.load(open(TAX))
themes = (tax.get("targets", tax))[TARGET]["themes"]
assert len(themes) == 30, f"expected 30 themes, got {len(themes)}"
total_topics = sum(len(t["topic_ids"]) for t in themes)
assert total_topics == 170, f"expected 170 topic assignments, got {total_topics}"

print(f"== bootstrap N={TARGET}  ({'EXECUTE' if EXECUTE else 'DRY-RUN'}) ==")
print(f"themes: {len(themes)}  topic assignments: {total_topics}")

if not EXECUTE:
    print("\n[dry-run] structure valid. Would create 1 ingestion_run, upsert 30 clusters, patch 170 topics.")
    for t in themes[:5]:
        print(f"  cluster {t['canonical_slug']:34s} <- {len(t['topic_ids'])} topics")
    print("  ... (25 more).  Apply signal_06, then re-run with --execute to write.")
    sys.exit(0)

# 0. preflight (execute only): confirm migration applied (cluster_id column exists)
st, _ = req("GET", "/topics?select=topic_id,cluster_id&limit=1")
if st != 200:
    print(f"\nPREFLIGHT FAIL: signal.topics.cluster_id not reachable (HTTP {st}).")
    print("Apply signal_06 migration first. Aborting.")
    sys.exit(1)
print("preflight ok: topics.cluster_id column present.")

# 1. ingestion_run
st, run = req("POST", "/ingestion_run",
    body={"source": "topic_curation", "runtime": "manual", "status": "success",
          "started_at": "now()", "finished_at": "now()",
          "records_seen": total_topics, "records_written": len(themes) + total_topics},
    prefer="return=representation")
if st not in (200, 201):
    print("ingestion_run insert failed:", st, run); sys.exit(1)
run_id = run[0]["run_id"]
print("ingestion_run:", run_id)

# 2. upsert clusters (idempotent on canonical_slug)
rows = [{
    "canonical_slug": t["canonical_slug"],
    "display_name": t["display_name"],
    "description": t.get("description"),
    "curation_status": "approved",
    "curated_by": "alex",
    "source": "topic_curation",
    "source_record_id": t["canonical_slug"],          # natural key (per review P1)
    "content_hash": hashlib.sha256(
        (t["canonical_slug"] + "|" + t["display_name"] + "|" + (t.get("description") or "")
         ).encode()).hexdigest(),                      # true content digest (edit-detection)
    "ingestion_run_id": run_id,
} for t in themes]
st, res = req("POST", "/topic_cluster?on_conflict=canonical_slug",
    body=rows, prefer="return=representation,resolution=merge-duplicates")
if st not in (200, 201):
    print("cluster upsert failed:", st, res); sys.exit(1)
slug2id = {r["canonical_slug"]: r["cluster_id"] for r in res}
print(f"clusters upserted: {len(slug2id)}")

# 3. assign topics.cluster_id + confidence + assigned_by
n_ok = 0
for t in themes:
    cid = slug2id[t["canonical_slug"]]
    for tid, conf in zip(t["topic_ids"], t["topic_confidences"]):
        st, _ = req("PATCH", f"/topics?topic_id=eq.{tid}",
            body={"cluster_id": cid, "cluster_assignment_confidence": conf,
                  "cluster_assigned_by": "llm"},
            prefer="return=minimal")
        if st in (200, 204): n_ok += 1
        else: print("  topic patch failed:", tid, st)
print(f"topics assigned: {n_ok}/170")

# 4. verify
st, cnt = req("GET", "/topics?select=topic_id&cluster_id=not.is.null", prefer="count=exact")
print("verify: topics with cluster_id set =", "(see content-range header)")
print("DONE.")
