# Topic Intelligence Modeling Layer — Spec (Signal 5 re-spec)

**Status:** Design proposal, **pre-migration gate** (nothing built yet) · **Date:** 2026-07-17
**Owner:** Alex · **Design pass:** `alex:cto-principal-architect` (drawing on knowledge-graph-modeling, embedding, data-storage skills)
**Depends on:** deployed `signal` schema (`supabase/migrations/signal_01`–`05`), `Phase_1/architecture.md` V2
**Supersedes:** Signal 5 ("two tracked topics intersecting") in `Phase_0/signal_seed_list.md`. Sits alongside the DROP of Signals 3 & 4 (see that file's changelog).

---

## 0. What this layer is (and the altitude correction)

The old Signal 5 was a *discrete signal* ("two topics co-occur"). Wrong altitude. The re-spec splits into two things the schema was quietly conflating:

- **The analytical substrate** — an always-on *model* of the topic graph (canonical themes, co-occurrence, trend, bridges) computed over the existing event graph. This is the **rung-2 modeling asset**. It is *state*, not events.
- **The discrete actionable signal** — a `signals` row of type `topic_intersection` that fires only when the substrate crosses a threshold worth a human's attention (a genuinely new intersection; a bridge person at converging themes).

The events pipeline gave us a labeled property graph (entities/events/topics as nodes, `relations` as typed edges) with **no organizing principle on the topic axis** — 170 flat slugs is noise. The whole make-or-break is **imposing a two-level taxonomy (theme → topic)** — just-enough-semantics, no deeper ontology.

**Why it's the right build:** no new data source (computes over the graph we already populated), it's differentiated **content** ("how [theme] moved across the last month of NYC AI events"), and it's relationship **targeting** (the people recurring at converging themes = who to know). It enriches Signals 1/2; it doesn't replace them. **Overall architecture confidence: 85% (high).**

---

## 1. Topic canonicalization — the make-or-break

### 1.1 Two different operations hide inside "dedup"
| Operation | Example | Treatment | Destructive? |
|---|---|---|---|
| **Synonym collapse** (same concept, different label) | "AI Agents" = "Agentic AI" | one topic, variants in `synonym_set` | optional |
| **Thematic grouping** (distinct concepts, one theme) | "Agentic Commerce" + "x402 Payment Rails" + "A2A Transactions" | distinct topics, grouped under one **cluster** | **never** |

**The trap:** merging the *second* category destroys the product. The value of this layer is detecting when "orchestrator-first" intersects "emergent-coordination"; collapse those and you've deleted the signal. **Bias hard toward under-merging.**

### 1.2 Model: a non-destructive cluster layer over a synonym-deduped topic base
```
topic_cluster  (canonical THEME)      ← analytical rollup ("Agentic Commerce & Payments")
     ▲ cluster_id
signal.topics  (atomic TOPIC)         ← keeps identity & provenance ("x402 Payment Rails")
     · synonym_set  (label variants)  ← ingest-time dedup guard (not a hard merge)
```
- `topics` stays the **atomic grain** — relations still point at raw `topic_id`, provenance preserved, nothing deleted (non-destructive; a wrong cluster is fixable without data loss).
- `topic_cluster` is the **canonical theme** — all three computations run primarily at cluster level.
- `synonym_set` finally gets a job: an ingest-time routing guard (reuse the entity resolver's citext-exact → `pg_trgm`-fuzzy ladder) so we stop minting new duplicate topics going forward.

Two-level hierarchy (theme → topic); **no OWL/ontology.** `parent_cluster_id` is reserved for a future third tier but stays NULL in V1.

### 1.3 How to produce the taxonomy (budget-conscious)
**Do NOT reach for embeddings first.** At n=170, the whole topic set fits one LLM context.

**Bootstrap (one-off, human-in-the-loop):**
1. Export all 170 topics (`display_name` + the richer Notion topic text — current-events/opportunities/challenges — as clustering input; pull description from Notion, since the spine `topics` row only carries `display_name`).
2. **One LLM call** (events-pipeline model class): "here are 170 topics; propose ~25–40 canonical themes, assign each topic to exactly one with confidence 0–1, flag pure synonyms." Cost: cents.
3. **Human-review the whole set once** (170 rows is one sitting). Approve/adjust clusters; approve blatant synonym merges. Mirrors "auto-merge strong, flag borderline" — but at bootstrap you review everything because the taxonomy is load-bearing and cheap to review at this size.
4. Write `topic_cluster` rows + `topics.cluster_id` + `synonym_set`. Optionally hard-merge the handful of blatant exact-synonym topics (repoint `relations`, log to `conflict_log` — reuse existing merge machinery).

**Incremental (ongoing):** new raw label → `pg_trgm` + `synonym_set` check → attach if match; else new topic, auto-assign to nearest cluster **only on high confidence, else `cluster_id = NULL` + `conflict_log` (`human_pending`)** — the identical resolver gate. "Nearest cluster" = a cheap one-topic LLM classify call.

**Embeddings deferred** (MT-7): local `all-MiniLM-L6-v2` (384-dim, free) or `text-embedding-3-small` into `topics.embedding vector(384)` — only earns its keep once topic volume outpaces cheap LLM classification (a long way off at ~3 topics/event). Cross-encoder reranking is overkill.

### 1.4 False-positive mitigation
| Risk | Mitigation |
|---|---|
| Merging distinct theses → destroys intersections | under-merge bias; clustering is non-destructive; synonym hard-merges human-approved only |
| LLM invents off-voice themes | full-set human review; `curation_status='proposed'→'approved'` gate |
| Cluster drift as corpus grows | quarterly re-review ritual; `cluster_assignment_confidence` surfaces low-confidence rows |
| Over-specific new topic auto-assigned wrong | auto-assign only on high confidence; else NULL + `conflict_log` |

Confidence in the cluster approach: **85%**. That LLM-one-shot beats embeddings at this scale: **90%**.

---

## 2. Schema — new objects

One dimension (`topic_cluster`), two `topics` column-adds, two computed tables (`topic_trend`, `topic_pair_metric`). **The `signals` fact table needs no structural change** — it already carries `topic_id`, `related_topic_id`, `payload`, `idempotency_key`.

### 2.1 `signal.topic_cluster` — canonical theme dimension
```sql
create table signal.topic_cluster (
  cluster_id        uuid primary key default gen_random_uuid(),
  canonical_slug    text not null unique,                 -- 'agentic-commerce-payments'
  display_name      text not null,                        -- 'Agentic Commerce & Payments'
  description       text,                                 -- editorial one-liner (content voice)
  parent_cluster_id uuid references signal.topic_cluster(cluster_id),  -- reserved; NULL in V1
  curation_status   text not null default 'proposed'
                      check (curation_status in ('proposed','approved','deprecated')),
  curated_by        text,                                 -- 'alex' | 'llm'
  source            text not null default 'notion_manual',
  source_record_id  text,
  content_hash      text,
  fetched_at        timestamptz not null default now(),
  last_verified_at  timestamptz not null default now(),
  last_modified_at  timestamptz not null default now(),
  ingestion_run_id  uuid not null references signal.ingestion_run(run_id),
  created_at        timestamptz not null default now(),
  constraint topic_cluster_identity check (source_record_id is not null or content_hash is not null)
);
alter table signal.topic_cluster enable row level security;
```

### 2.2 `signal.topics` — column adds
```sql
alter table signal.topics
  add column cluster_id                     uuid references signal.topic_cluster(cluster_id),
  add column cluster_assignment_confidence  numeric,          -- 0..1
  add column cluster_assigned_by            text;             -- 'alex' | 'llm' | 'auto'
create index topics_cluster on signal.topics(cluster_id);
```
Nullable FK = a topic can be unassigned (pending review) without blocking ingestion. **Single-membership in V1** (open decision Q1).

### 2.3 `signal.topic_trend` — time-windowed trend (computed substrate)
```sql
create table signal.topic_trend (
  trend_id               uuid primary key default gen_random_uuid(),
  subject_level          text not null check (subject_level in ('topic','cluster')),
  subject_id             uuid not null,                 -- topic_id or cluster_id
  window_type            text not null check (window_type in ('week','month','all_time')),
  as_of_date             date not null,
  event_count            int  not null default 0,
  distinct_speaker_count int  not null default 0,
  prior_event_count      int,                            -- same window length, preceding period
  momentum               numeric,                        -- (event_count - prior)/greatest(prior,1)
  trend_label            text check (trend_label in
                           ('heating','steady','cooling','new','insufficient_data')),
  is_low_confidence      boolean not null default false, -- event_count below min-n guard
  source                 text not null default 'computed',
  content_hash           text not null,                  -- hash of computation inputs (idempotency)
  ingestion_run_id       uuid not null references signal.ingestion_run(run_id),
  computed_at            timestamptz not null default now(),
  created_at             timestamptz not null default now()
);
create unique index topic_trend_grain_uq
  on signal.topic_trend(subject_level, subject_id, window_type, as_of_date);
create index topic_trend_asof on signal.topic_trend(as_of_date desc, window_type);
alter table signal.topic_trend enable row level security;
```
Grain: one (subject, window, as_of_date) snapshot. Append-only daily snapshots = the trajectory history needed to say "heating." Unique index → same-day recompute is an idempotent upsert.

### 2.4 `signal.topic_pair_metric` — co-occurrence **and** bridge (unified)
Co-occurrence and bridge are two projections of the same topic-pair space (shared **events** vs shared **people**) → one table:
```sql
create table signal.topic_pair_metric (
  pair_metric_id           uuid primary key default gen_random_uuid(),
  subject_level            text not null check (subject_level in ('topic','cluster')),
  subject_a_id             uuid not null,
  subject_b_id             uuid not null,
  window_type              text not null check (window_type in ('week','month','all_time')),
  as_of_date               date not null,
  cooccurrence_event_count int  not null default 0,   -- COMPUTATION 1 (shared events)
  bridge_person_count      int  not null default 0,   -- COMPUTATION 3 (shared speakers)
  bridge_entity_ids        uuid[] not null default '{}',  -- who bridges (targeting payload)
  first_cooccurred_on      date,                        -- earliest shared-event date (novelty)
  is_new_pair              boolean not null default false, -- first co-occ inside window
  intersection_score       numeric,                     -- composite weight (tunable)
  source                   text not null default 'computed',
  content_hash             text not null,
  ingestion_run_id         uuid not null references signal.ingestion_run(run_id),
  computed_at              timestamptz not null default now(),
  created_at               timestamptz not null default now(),
  constraint topic_pair_order check (subject_a_id < subject_b_id)   -- canonical order, no dupes/self-pairs
);
create unique index topic_pair_grain_uq
  on signal.topic_pair_metric(subject_level, subject_a_id, subject_b_id, window_type, as_of_date);
create index topic_pair_asof on signal.topic_pair_metric(as_of_date desc, window_type);
create index topic_pair_bridge_gin on signal.topic_pair_metric using gin (bridge_entity_ids);
alter table signal.topic_pair_metric enable row level security;
```
`bridge_entity_ids uuid[]` + GIN keeps "who to know" queryable/joinable without a fourth table (normalized `topic_bridge_member` is the scale path — MT-8).

**Why tables, not materialized views:** matviews hold one current snapshot; trend + novelty both need history. Append-only `as_of_date` snapshots give week-over-week deltas for free. At this volume, storage is a rounding error.

### 2.5 Provenance / RLS
House conventions: provenance columns + RLS deny-all + service-role writes; `source='computed'` on the two computed tables; `moddatetime` on `topic_cluster.last_modified_at` (computed tables are snapshot-immutable). **Deliberate minor deviation:** skip per-row `signal.provenance` on the computed snapshot tables — `ingestion_run_id` + `content_hash` + append-only history already give full lineage/replay. Reserve `provenance` for source-derived dimensions.

---

## 3. The three computations (real SQL, deployed schema)

Edge encoding (from live DDL): `tagged_topic` = `from_type='event' → to_type='topic'`; speaker edges = `from_type='entity' → to_type='event'`, `relation_type in ('speaker_at','host_of','panelist_at')`. Windows are **rolling** (last 7 / 30 days from `as_of_date`; `all_time` = no date filter).

### 3.1 Computation 1 — Co-occurrence (topic↔topic via shared events)
```sql
-- cluster-level co-occurrence, month window (swap interval / drop filter for week / all_time)
with topic_events as (
  select r.to_id as topic_id, r.from_id as event_id
  from signal.relations r
  where r.relation_type='tagged_topic' and r.from_type='event' and r.to_type='topic' and r.is_active
),
cluster_events as (
  select distinct t.cluster_id, te.event_id
  from topic_events te
  join signal.topics t on t.topic_id = te.topic_id
  join signal.events e on e.event_id = te.event_id
  where t.cluster_id is not null
    and e.event_date >= current_date - interval '30 days'   -- window parameter
)
select ce1.cluster_id as subject_a_id,
       ce2.cluster_id as subject_b_id,
       count(distinct ce1.event_id) as cooccurrence_event_count,
       min(e.event_date) as first_cooccurred_on
from cluster_events ce1
join cluster_events ce2
  on ce1.event_id = ce2.event_id
 and ce1.cluster_id < ce2.cluster_id             -- canonical order → no self-pairs, no dupes
join signal.events e on e.event_id = ce1.event_id
group by ce1.cluster_id, ce2.cluster_id;
```

### 3.2 Computation 2 — Time-windowed trend (theme trajectory)
```sql
-- cluster trend, month window; momentum = this window vs the immediately preceding window
with tagged as (
  select t.cluster_id, e.event_id, e.event_date
  from signal.relations r
  join signal.events e on e.event_id = r.from_id
  join signal.topics t on t.topic_id = r.to_id
  where r.relation_type='tagged_topic' and r.from_type='event' and r.to_type='topic' and r.is_active
    and t.cluster_id is not null
),
this_window as (
  select cluster_id, count(distinct event_id) as event_count
  from tagged where event_date >= current_date - interval '30 days' group by cluster_id
),
prior_window as (
  select cluster_id, count(distinct event_id) as prior_event_count
  from tagged
  where event_date >= current_date - interval '60 days' and event_date < current_date - interval '30 days'
  group by cluster_id
),
speakers as (
  select tg.cluster_id, count(distinct sp.from_id) as distinct_speaker_count
  from tagged tg
  join signal.relations sp
    on sp.to_type='event' and sp.to_id = tg.event_id
   and sp.relation_type in ('speaker_at','host_of','panelist_at') and sp.is_active
  where tg.event_date >= current_date - interval '30 days'
  group by tg.cluster_id
)
select tw.cluster_id, tw.event_count,
       coalesce(s.distinct_speaker_count,0) as distinct_speaker_count,
       coalesce(pw.prior_event_count,0)     as prior_event_count,
       (tw.event_count - coalesce(pw.prior_event_count,0))::numeric
         / greatest(coalesce(pw.prior_event_count,0),1) as momentum
from this_window tw
left join prior_window pw on pw.cluster_id = tw.cluster_id
left join speakers s      on s.cluster_id  = tw.cluster_id;
```
**`trend_label` (thin-data-honest):** `event_count < 3` → `insufficient_data` + `is_low_confidence=true` (non-negotiable at n=59; no manufactured momentum on n=2). `prior=0 AND count≥3` → `new`. `momentum ≥ +0.5` → `heating`; `≤ −0.5` → `cooling`; else `steady`. **V1 surfaces `month` + `all_time` only**; `week` is stored but flagged low-confidence and kept out of emitted signals until the corpus thickens.

### 3.3 Computation 3 — Shared-speaker bridges (who's at the intersection)
```sql
-- cluster-level bridges: people who speak at events of two different themes (month window)
with speaker_cluster as (
  select distinct sp.from_id as entity_id, t.cluster_id
  from signal.relations sp
  join signal.events e  on e.event_id = sp.to_id
  join signal.relations tt on tt.from_type='event' and tt.from_id = e.event_id
                          and tt.relation_type='tagged_topic' and tt.is_active
  join signal.topics t on t.topic_id = tt.to_id
  where sp.to_type='event'
    and sp.relation_type in ('speaker_at','host_of','panelist_at') and sp.is_active
    and t.cluster_id is not null
    and e.event_date >= current_date - interval '30 days'
)
select sc1.cluster_id as subject_a_id,
       sc2.cluster_id as subject_b_id,
       count(distinct sc1.entity_id)     as bridge_person_count,
       array_agg(distinct sc1.entity_id) as bridge_entity_ids
from speaker_cluster sc1
join speaker_cluster sc2
  on sc1.entity_id = sc2.entity_id and sc1.cluster_id < sc2.cluster_id
group by sc1.cluster_id, sc2.cluster_id;
```
The knowledge-graph "expertise graph" pattern: a person bridging two themes is a de-facto connector at that intersection — your "who to know."

### 3.4 Scoring
The nightly job UPSERTs computations 1+3 into one `topic_pair_metric` row per pair/window:
```
intersection_score = cooccurrence_event_count + 2*bridge_person_count + novelty_bonus
```
Bridges weighted higher (targeting gold); `novelty_bonus` if `is_new_pair`. **Weights are tunable and documented, not sacred** — the honest position at n=59.

---

## 4. Runtime (script-first, then pg_cron — locked D4)

| Step | Runtime | Why |
|---|---|---|
| Bootstrap canonicalization (LLM taxonomy + human review → write cluster/`cluster_id`/`synonym_set`) | **one-off app script**, manual | needs LLM + human gate; idempotent upserts by `canonical_slug` |
| Incremental topic→cluster assignment on new topics | **app-code in the `events_pipeline` ingest path** | needs LLM classify + `pg_trgm`; writes `conflict_log` on low confidence |
| Computations 1–3 + trend labels | **`pg_cron` nightly** (~02:30 UTC, after the 02:00 dedup sweep) | pure SQL, zero external calls — textbook pg_cron |
| `topic_intersection` signal emission | **`pg_cron`, same nightly job**, after snapshots | pure SQL comparing snapshots to detect newly-crossed thresholds |

**Idempotency/recompute:** trends/pairs keyed by `(subject, window, as_of_date)` unique indexes → same-day reruns UPSERT (no-op). Graph is tiny → **full nightly recompute** of the current `as_of_date` (truncate-reload that date; never touch prior dates). No incremental-delta machinery (premature). Signal emission idempotent via `signals.idempotency_key`. **No n8n dependency for the pure-SQL parts** (fallback: GitHub Actions cron for the incremental assignment).

---

## 5. Outputs / synthesis (content + targeting)

Expose via the `signal_read` view contract (architecture §6), split strictly on PII:

**Public-safe (no PII → Hub "The Work, Live"):**
- `signal_read.v_topic_movement` — cluster trend deltas, current month (theme, event_count, momentum, trend_label). Raw material for *"how [theme] moved across the last month."*
- `signal_read.v_topic_intersections` — cluster pairs with `cooccurrence_event_count`, `bridge_person_count` (the **count**, not the people), `is_new_pair`, `intersection_score`.

**Cockpit-only (PII → owner + R2 dashboard, never public Hub):**
- `signal_read.v_bridge_people` — `bridge_entity_ids` exploded, joined to `entities`, **LEFT JOIN `suppression` and excluded where an active suppression exists** (hard gate read first). This is "who to know," suppression-clean.

**Synthesis layer:** V1 = the views + the R2 dashboard rendering them. A monthly LLM "topic intelligence brief" is valuable but **explicitly deferred** — it's a content-adjacent skill, and CLAUDE.md red-flag #4 blocks any new content skill before the R2 dashboard exists. Consumers read **views, never base tables**.

---

## 6. `signals` enum change

Deployed CHECK: `('shared_event_attendance','speaker_host_status','talent_density_event','same_day_cross_event_pairing','topic_intersection','event_conversation_count','dm_reply')`. Both dropped types have **0 rows** → non-destructive.
```sql
alter table signal.signals drop constraint signals_signal_type_check;   -- confirm actual name via \d
alter table signal.signals add  constraint signals_signal_type_check
  check (signal_type in (
    'shared_event_attendance','speaker_host_status','topic_intersection',
    'event_conversation_count','dm_reply'));
```
**Keep ONE type `topic_intersection`, discriminate by `payload.intersection_type ∈ {cooccurrence_first, bridge, trend_breakout}`** (payload absorbs new attributes without migration; keeps the review consumer simple; matches "Signal 5 elevated" not fragmented).

**Emitted-signal shape:** `signal_type='topic_intersection'`, `source='computed'`, `status='pending'`; `topic_id`/`related_topic_id` = representative underlying topics of the two clusters; cluster IDs + metrics in `payload`; `subject_entity_id` = top bridge person (aids review). `idempotency_key = sha256('topic_intersection'||cluster_a||cluster_b||window||first_cooccurred_on)` so a pair fires once. **Emission gate:** emit only when `is_new_pair` AND both clusters have ≥2 prior events AND no prior signal with that key.

---

## 7. Build sequence

- **Slice 0 — Canonicalization + first artifact** (proves value, ~zero new runtime): bootstrap script → LLM taxonomy → human review → write `topic_cluster` + `cluster_id` + `synonym_set`; run Computation 1 once, manually; hand-write the first "themes across 3 months + how they connect" piece. Validates the content thesis before any pipeline. **Value confidence: 80%.**
- **Slice 1 — Substrate + views:** `topic_trend` + `topic_pair_metric`; nightly pg_cron (Computations 1–3; month + all_time surfaced, week stored/low-confidence); `signal_read` views; R2 dashboard renders them. **85%.**
- **Slice 2 — Discrete signal + targeting:** `topic_intersection` emission; suppression-gated `v_bridge_people`. **80%.**
- **Deferred:** pgvector/embeddings (MT-7); multi-cluster membership; normalized `topic_bridge_member` (MT-8); week-window signals; the LLM synthesis-brief skill (blocked behind R2 by red-flag #4); `parent_cluster_id` third tier.

**Risks:** canonicalization false-merge (highest stakes → under-merge bias + non-destructive + full human review); thin data at n=59 (trends are *directional, not statistical* → min-n guards + `is_low_confidence` + honest labels — state this on the portfolio artifact, don't hide it); cluster drift (quarterly re-review); PII leak via bridge people into the public Hub (strict cockpit-only views; audit `signal_read` on first build).

---

## Open decisions for Alex (resolve at the "go from there" gate, before building)

1. **Single vs multi cluster membership** — *recommend single* (`topics.cluster_id`); intersections should emerge from event-level co-occurrence, not a topic living in two themes. Multi-membership = deferred bridge table.
2. **Cluster granularity (~25–40 themes)** — an *editorial/voice* decision; sets the resolution of every downstream narrative. Your number.
3. **Synonym hard-merge scope** — *recommend* hard-merge only the obvious handful (human-approved, reuses merge machinery); cluster everything else non-destructively.
4. **Runtime** — *recommend* bootstrap = script, computations = pg_cron nightly; no n8n needed for the pure-SQL parts. Confirm.
5. **Enum** — *recommend* drop `talent_density_event` + `same_day_cross_event_pairing`; keep single `topic_intersection` discriminated by `payload.intersection_type`. Confirm.
6. **PII boundary** — *recommend* named bridge people stay **cockpit-only**, never the public Hub view. Confirm.

## Doc map
Companion changes: `Phase_0/signal_seed_list.md` (Signals 3 & 4 dropped, Signal 5 → here) + its changelog · `Phase_1/architecture.md` V2.2 amendment (new objects, enum, runtime, MT-7/MT-8) · `supabase/schema.md` (new tables) · `Phase_1/ingestion_mvp.md` (deferred section) · `docs/THE_PLAN.md` (Capstone 1 scope).
