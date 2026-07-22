# Signal Seed List — Changelog

Revision log for `signal_seed_list.md`. Newest first.

## 2026-07-17 — Signals 3 & 4 dropped; Signal 5 elevated to the topic-intelligence modeling layer

**Decided by:** Alex, after building & shipping Signals 1 & 2 (YED-108) and reviewing the taxonomy against reality.

- **Signal 3 (talent-density event format) — DROPPED.** Two independent reasons: (a) the data doesn't exist — Luma's post-overhaul API is paid (Luma Plus) and scoped to *your own* calendars, exposes no guest list, and public discovery would require scraping (banned by the ethics rule); iCal subscription gives listings but not room composition. (b) More fundamentally, it solves the wrong problem — a density *prediction* helps you *choose* rooms, but the real constraint is *access* to rooms, and Alex is already the human curator of what's worth surfacing. This also **removes the planned `rss_luma` source contract** (source #2).
- **Signal 4 (same-day cross-event thesis pairing) — DROPPED.** Same-day event volume is too small to justify a build, and it is a special case of topic intersection — a `same-day` filter over Signal 5's co-occurrence output, not a separate signal.
- **Signal 5 (two tracked topics intersecting) — ELEVATED & RE-SPEC'd** as the **topic-intelligence modeling layer** (rung-2 modeling asset), not a discrete signal. Full spec: [`Phase_1/topic_intelligence_spec.md`](../Phase_1/topic_intelligence_spec.md). Three computations (co-occurrence, time-windowed trend, shared-speaker bridges) over a non-destructive `theme → topic` cluster taxonomy; produces differentiated content + relationship targeting; a discrete `signals` row of type `topic_intersection` fires only on threshold crossings.

**Downstream doc changes:** `Phase_1/architecture.md` (V2.2 amendment — new `signal` objects, enum change, runtime), `supabase/schema.md`, `Phase_1/ingestion_mvp.md`, `docs/THE_PLAN.md`. Signals 6 & 7 (funnel outcomes) unchanged. Signals 1 & 2 shipped and live (452 signal rows).
