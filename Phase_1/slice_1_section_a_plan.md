# Slice 1 · Section A — Build Plan (spine substrate, solo in gtm-os)

**Issue:** YED-110 · **Depends on:** Slice 0 (shipped, PR #11) · **Spec:** `Phase_1/topic_intelligence_spec.md` §2.3–2.4, §3, §4, §8
**Scope boundary:** everything here is **spine-side and needs no Hub.** The `signal_read` views + R2 render are **Section B** (joint gtm-os + Hub session) — out of scope for this build.

---

## What it is

Slice 0 produced a **static snapshot**: 30 themes, 170 topics assigned, one co-occurrence run. Section A turns that into a **living, time-aware model**:

- **Trend** — nightly snapshots of each theme's trajectory (event volume, speaker breadth, momentum vs the prior window → `heating`/`cooling`/`steady`/`new`/`insufficient_data`).
- **Intersections** — theme-pair co-occurrence (shared events) **and** shared-speaker bridges (who connects two themes), scored.
- **History** — append-only daily `as_of_date` snapshots, so we can later say "this theme has been heating for three weeks," not just "it's hot today."
- **Self-instrumentation** — a health view that trips when a V1 simplification hits its ceiling (§8 tripwires).
- **Durability** — a keep-awake heartbeat so the free-tier spine can't auto-pause and gap the trend history.

## Why (now, and this shape)

- It's the actual **rung-2 modeling asset** — Slice 0 was the primitive; this makes it *temporal* + *relational*, which is the differentiated GTM-engineering portfolio piece.
- It's **pure SQL over the graph we already populated** — no new source, no Hub dependency, fully buildable solo.
- **Momentum is real on day 1:** `trend_label`/`momentum` compare the last-30-days window to the 30–60-days-prior window, both from `event_date` — so the *first* nightly run already produces genuine heating/cooling reads. The `as_of_date` history then accrues the trajectory-of-the-trajectory over time. Value is immediate; it compounds.
- Honest at n=59: trends are **directional, not statistical**. Min-n guards + `is_low_confidence` + honest labels are baked in (spec §3.2) — state it on the artifact, don't hide it.

---

## Prerequisites / confirm at the top of the build

1. **Spine reachable** — REST probe first (free tier may have auto-paused; restore in dashboard if NXDOMAIN). No fabricated numbers.
2. **`pg_cron` availability** — verify the extension is installable/enabled on this Supabase instance (it was *listed available* at 1.6.4 in the arch doc, but confirm live). If blocked, fallback = GitHub Actions cron hitting a compute endpoint (arch MT-5).
3. **Synonym merges run FIRST** (Step 1) — trend/co-occurrence counts must not double-count the 6 synonym duplicates. This is why the merges were deferred to here.
4. **Suppression seeding is NOT a Section A prerequisite** — bridges store *all* speaker entities in `topic_pair_metric.bridge_entity_ids`; the suppression gate is applied at the **view** layer (Section B). Keep Section A clean of PII gating.
5. **Cluster-level only in V1** — populate `subject_level='cluster'` (the 30 themes). Topic-level snapshots are supported by the schema but deferred.

---

## Build steps (ordered; dependencies noted)

### Step 0 — Preflight + branch
- REST probe: confirm spine up, re-confirm counts (topics should be **170**, or **164** after Step 1).
- Branch `alex/yed-110-topic-intel-slice-1` off main.

### Step 1 — Run the deferred synonym merges  *(clean the base before any snapshot)*
- Script exists: `scripts/topic_intelligence/merge_synonyms.py.deferred` (dry-run validated: 6 losers → 5 survivors, 7 relations repointed, 0 conflicts).
- **Destructive → blocked by the auto-mode classifier last time.** Alex runs it (`! python3 …merge_synonyms.py --execute`) or grants a Bash permission rule.
- Verify: topics **170 → 164**; 5 `conflict_log` rows (`human_resolved`, `alex`); survivors carry `synonym_set` entries.
- Promote the script into the repo (drop the `.deferred` suffix) as the tracked artifact.

### Step 2 — `signal_07` migration: the two computed tables  *(needs Step 1 done so grain is clean)*
- `signal.topic_trend` (spec §2.3): grain `(subject_level, subject_id, window_type, as_of_date)`; `event_count`, `distinct_speaker_count`, `prior_event_count`, `momentum`, `trend_label` CHECK, `is_low_confidence`, `source='computed'`, `content_hash`, `ingestion_run_id`. Unique index on the grain; index `(as_of_date desc, window_type)`. RLS deny-all.
- `signal.topic_pair_metric` (spec §2.4): canonical-ordered pair (`CHECK subject_a_id < subject_b_id`), `cooccurrence_event_count`, `bridge_person_count`, `bridge_entity_ids uuid[]`, `first_cooccurred_on`, `is_new_pair`, `intersection_score`, provenance-lite. Unique index on grain; GIN on `bridge_entity_ids`. RLS deny-all.
- **Deliberate:** computed tables skip per-row `signal.provenance` (lineage via `ingestion_run_id` + `content_hash` + `as_of_date`).
- **Review with `cto-principal-architect`** before apply (same discipline as `signal_06`). Apply via dashboard SQL editor (or CLI). Verify tables reachable over REST.

### Step 3 — The three computations as SQL  *(needs Step 2)*
Author + **test each manually once** (run, eyeball outputs sane) before wiring to cron:
- **C1 Co-occurrence** (§3.1) — cluster pairs via shared events. (Logic already validated in Slice 0: `computation1_cooccurrence_n30.json`.)
- **C2 Trend** (§3.2) — this-window vs prior-window per theme; `momentum`, `distinct_speaker_count`; `trend_label` rules: `event_count<3` → `insufficient_data`+`is_low_confidence`; `prior=0 AND count≥3` → `new`; `momentum≥+0.5` → `heating`; `≤−0.5` → `cooling`; else `steady`. Compute **month + all_time** (surfaced) and **week** (stored, `is_low_confidence`, not surfaced).
- **C3 Bridges** (§3.3) — shared speakers (`speaker_at`/`host_of`; note: no `panelist_at` edges exist) across cluster pairs → `bridge_person_count` + `bridge_entity_ids`.
- **Scoring:** `intersection_score = cooccurrence_event_count + 2*bridge_person_count + novelty_bonus(is_new_pair)`. Weights documented-not-sacred at n=59.
- Writes UPSERT into the two tables keyed on their unique grain (same-day rerun = idempotent no-op).

### Step 4 — `pg_cron` nightly job  *(needs Step 3 + Step 6 heartbeat live)*
- Enable `pg_cron`; schedule the C1–C3 + trend-label + scoring SQL **nightly ~03:30 UTC** (one `as_of_date` snapshot/day).
- **Full recompute of the current `as_of_date`** (truncate-reload that date only; never touch prior dates). No incremental-delta machinery (premature at this volume).
- Wrap each run in an `ingestion_run` (`runtime='pg_cron'`) for lineage.

### Step 5 — `topic_intelligence_health` view + tripwires  (§8)
- A view computing the "V1 assumptions" metrics: single-membership pressure (2nd-best-cluster closeness), occupancy skew (any theme >~20% of events / >~40% themes `insufficient_data`), `conflict_log` unassigned rate, **`as_of_date` gaps in `topic_trend`** (the heartbeat tripwire), intersection-type routing divergence.
- First-class Section-A deliverable, not an afterthought — it's the "shipped the simple version *and* instrumented when it stops being enough" signal.

### Step 6 — GitHub Actions keep-awake heartbeat  *(build EARLY — independent, protects everything)*
- `.github/workflows/spine-heartbeat.yml`: daily cron → `GET /rest/v1/events?limit=1` against the spine, using repo secrets (`SUPABASE_SPINE_URL`, `SUPABASE_SPINE_SERVICE_KEY` — or the publishable/anon key for a pure liveness ping).
- Why early: a paused free-tier project **can't run its own `pg_cron`** (chicken-and-egg) and gaps the `topic_trend` history the whole heating/cooling story depends on. This is the $0 fix (vs Supabase Pro).

### Step 7 — Verify end-to-end + commit
- Run the nightly job manually once → confirm `topic_trend` (30 clusters × {month, all_time, week}) + `topic_pair_metric` populate; spot-check a `heating` theme and a top intersection against the Slice-0 numbers.
- Independent DB verification (counts + a couple of hand-computed checks) — no relayed numbers.
- Commit + PR (conventional title: `feat: …`; scopes must be in `{deps,app,sdk,agent,cli,docs}` or omit scope — see `.github/workflows/semantic-pull-request.yml`).

---

## Dependency order (critical path)

```
Step 0 preflight/branch
  └─ Step 1 synonym merges (Alex-run) ──┐
  └─ Step 6 heartbeat (parallel) ───────┤
                                        ▼
                         Step 2 signal_07 migration (cto review → apply)
                                        ▼
                         Step 3 computations (author + manual test)
                                        ▼
                         Step 4 pg_cron nightly  (needs heartbeat live)
                                        ▼
                         Step 5 health view + tripwires
                                        ▼
                         Step 7 verify + PR
```

## Decisions to confirm tomorrow (fast)
1. **`pg_cron` vs GitHub-Actions-cron** for the nightly compute — confirm pg_cron is enable-able live; else fallback.
2. **Heartbeat key** — service key vs publishable/anon key for the liveness ping (prefer least-privilege; anon can't read `signal` but *can* hit a trivial public endpoint — decide the exact URL).
3. **Commit the synonym script promotion** (`.deferred` → tracked) in this PR or separately.

## Explicitly NOT in Section A (→ Section B, with the Hub)
`signal_read` views (`v_topic_movement`, `v_topic_intersections`, `v_bridge_people` — anon-grantable, suppression-gated), the R2 dashboard render, suppression day-1 seeding, and the `topic_intersection` discrete-signal emission (that's Slice 2). Red-flag #4 clears when the Hub renders these views.

## Learning tie-in
This is practice-through-building for **D3** (signal/data engineering) + **D4** (dimensional modeling — SCD-ish snapshot history, trend logic). Pair with **YED-46** (Mode SQL + dbt) so the tutorial rides the real work; log time-on-task in GTM University.
