# Build Journal — gtm-os Signal Pipeline

Manual seed for the automated build journal (YED-119). One entry per logical milestone:
**what** was built, **why**, **why it was built that way**, **deviations**, **learnings**.
Chronological. Ports into the Hub's "Work, Live" build-journal surface when that ships.

---

## The arc so far (topic-intelligence layer · YED-110)

A one-line read of the journey these entries trace:

> A flat list of 170 event topics became **30 canonical themes** (Slice 0), then a **validated, self-instrumented temporal model** of how those themes move and who connects them (Slice 1 Section A) — reviewed at every schema step, validated against an independent reference, and honest about exactly where V1 stops.

---

## 2026-08-06 · Slice 0 — 30-theme taxonomy · PR #11

- **What.** `signal.topic_cluster` dimension + non-destructive `topics` membership columns; 170 topics clustered into 30 canonical themes; the first "how the themes connect" content proof (Notion, `needs_review`).
- **Why.** Turn a flat topic list (noise) into a queryable theme model — the rung-2 modeling asset that produces differentiated content + relationship targeting, computed over the existing event graph (no new source).
- **Why this way.** N=30 wasn't guessed — clustering ran at 20/30/40 and 30 was chosen from a **calibration report** (intersection density 0.274, the selective-middle band). Under-merge bias enforced: distinct theses (Agentic Commerce / x402 rails / A2A) stay separate topics under one theme, never fused — merging them would delete the very signal the layer exists to find.
- **Deviations.** The `cto-principal-architect` review caught a real provenance smell: anchoring identity on `sha256(canonical_slug)` in `content_hash` would have permanently neutered edit-detection. Changed to `source_record_id = canonical_slug` (the natural key), `content_hash` reserved for a true digest.
- **Learnings.** Calibrating N against a measurable (intersection density) beats a taste call — and it produced evidence to defend the choice. The taxonomy's central risk (false-merging distinct theses) is live in the real corpus, so the under-merge bias earned its keep.

## 2026-08-06 · Cross-thread — R2 dashboard = the Hub

- **What.** Resolved the R2-dashboard / Hub overlap: the "R2 measurement dashboard" *is* the Hub (`gtm-os-hub`); no separate `apps/dashboard` (never built). Doc drift fixed on `main`.
- **Why / why this way.** A lagging pointer in `architecture.md` implied two dashboards. Syncing it to the already-made decision (recorded authoritatively Hub-side) — plus reconciling a contradiction where §7 said both "anon key + RLS" and "service-role server-side."
- **Learnings.** The reconciliation (anon+RLS for public tiers, service-role for the cockpit) became a durable constraint for Section B's views — captured before it could drift again.

## 2026-08-06 · Decision — shared vs separate taxonomy · YED-116

- **What.** Decided (then reversed, then closed) whether gtm-os and the Empire State market-intelligence engine should share one canonical theme vocabulary. **Outcome: keep separate for now.**
- **Why this way.** First leaned "shared" (one ecosystem, one definition of "GTM"/"Observability"). On reflection: gtm-os is deliberately *focused*; Empire State is inherently *broad*. Forcing convergence now is premature — the two have genuinely different scopes and grains.
- **Learnings.** Surfaced that the two engines share a *data plane* (Notion/HubSpot) but are siloed at the analytical spine (separate Supabase projects, separate accounts, by design). The overlap is real but not worth collapsing yet.

## 2026-08-06 · Slice 1 Section A — computed substrate + validated compute · PR #12 · YED-120

- **What.** `topic_trend` + `topic_pair_metric` (`signal_07`); a nightly `compute_topic_intelligence` function (trend / co-occurrence / bridges, cluster-level, 3 windows); an independent Python reference; the keep-awake heartbeat.
- **Why.** Make the Slice-0 snapshot *temporal* (trajectory) and *relational* (who bridges themes) — the actual living model. Pure SQL over the graph, no Hub dependency.
- **Why this way.** The nightly job does a **DELETE-by-`as_of_date` + INSERT reload**, not a blind UPSERT — the review flagged that `topic_pair_metric` has a *dynamic* row set, so an upsert would leave stale orphan pairs after a recompute, reading as real intersections (a fabricated-number risk). Idempotent, single-transaction, cluster-level. Validated via **EDD**: the SQL output was diffed against a hand-rolled Python reference and matched exactly (30 trend rows, 124 pairs, every score) before anything ran unattended.
- **Deviations / findings.**
  - **Stale-corpus windows** — the corpus ends Jul 17; computed against today, the month window has 8 events and the week window has 0. The rolling-trend story is dormant until fresh events ingest. The model is correct; the data is static. Surfaced by the reference check, not guessed.
  - **Bridge inflation** — a single event tagged with two themes makes all its speakers "bridge" that pair, so bridge counts correlate with co-occurrence rather than isolating genuine cross-event connectors. Matches the spec; flagged for refinement before bridges drive targeting.
- **Learnings.** Building the independent reference *first* paid for itself immediately — it caught both findings before they could hide in a plausible-looking dashboard. "The model is right, the data is stale" is a different (and more honest) statement than "the trends look flat."

## 2026-08-06 · Section A — health view + tripwires · YED-120 Step 5

- **What.** `signal.topic_intelligence_health` — one row per V1 simplification, status ok/watch/trip vs a threshold (spec §8).
- **Why / why this way.** Every V1 shortcut is instrumented so it can't rot into a forgotten decision. Shipping the simple version *and* the exact conditions under which it stops being enough is a stronger signal than the pipeline alone.
- **Deviations.** First render exposed a logic bug — a zero-threshold tripwire read "watch" at a metric of 0. Fixed the status math (backlog threshold set to a meaningful count).
- **Learnings.** The strip immediately, honestly flagged the three simplifications we made on purpose (occupancy 0.207, insufficient 1.000, bridge ratio 17 — all TRIP). Self-instrumentation that tells the truth on day one is doing its job.

## 2026-08-06 · Process — auto-close bug, and the fix

- **What.** Merging PR #11 auto-closed the *epic* YED-110 (the GitHub↔Linear integration completes any issue whose linked branch merges). Reopened it; then created **sub-issues** (YED-120 Section A, YED-122 Section B) so slice PRs close the sub-issue, not the epic. Verified on PR #12: YED-120 closed, epic stayed open.
- **Learnings.** Branch-name-driven auto-close is a real footgun for epics-with-slices. Sub-issues per slice is the clean structural fix, not a per-merge manual correction.

## 2026-08-06 · Meta — explainer + build-journal scoped

- **What.** Published a visual explainer of the topic-intelligence layer (Artifact); scoped the automated build journal (YED-119); this doc is its manual seed.
- **Why.** The Hub can show *what shipped* but not *the thinking* — which is the differentiator. Capturing the reasoning and the honest limits turns the process itself into portfolio content.

---

*Operational state at journal write: `signal_06`/`07` applied; compute function + health view live; pg_cron `topic-intel-nightly` scheduled (job 1, 03:30 UTC); heartbeat armed (secrets set). Next: Slice 0 content review (yours), Section B with the Hub (YED-122).*
