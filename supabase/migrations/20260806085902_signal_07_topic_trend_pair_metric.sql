-- signal_07 — topic-intelligence layer, Slice 1 Section A (YED-120)
-- The two COMPUTED substrate tables: theme trajectory (topic_trend) + theme-pair
-- co-occurrence & shared-speaker bridges (topic_pair_metric). Append-only daily
-- as_of_date snapshots; the nightly pg_cron job writes them (source='computed').
-- Spec: Phase_1/topic_intelligence_spec.md §2.3–2.4, §3 · Runbook: Phase_1/slice_1_section_a_plan.md
--
-- Design notes (deliberate, consistent with the spec):
--   * source='computed' (default) is HONEST here — unlike signal_06's dimensions, these rows
--     ARE computed, so the default is correct.
--   * Snapshot-IMMUTABLE: no last_modified_at, no moddatetime trigger. Identity/lineage =
--     (grain unique index) + content_hash (NOT NULL) + ingestion_run_id + append-only as_of_date.
--     No per-row signal.provenance (arch §0.6 deviation — lineage already complete).
--   * Idempotency: unique grain index → same-day recompute UPSERTs (truncate-reload that
--     as_of_date only; never touch prior dates). Same begin/commit + IF NOT EXISTS pattern as signal_06.
--
-- APPLY: paste whole file into the Supabase SQL editor (atomic). If via `supabase db push`,
--   drop the begin/commit wrapper (the CLI manages the migration transaction).
--
-- NIGHTLY WRITE CONTRACT (cto-principal-architect review 2026-08-06 — enforce in Steps 3–4):
--   * RELOAD, do NOT blind-UPSERT. Each run: DELETE FROM <table> WHERE as_of_date = :d; then INSERT
--     the freshly computed snapshot for :d. topic_pair_metric has a DYNAMIC row set (only co-occurring
--     pairs) — a pure ON CONFLICT UPSERT leaves stale orphan pairs when a recompute yields fewer, and
--     those orphans read as real intersections downstream ("no fabricated numbers" violation).
--   * ATOMIC: wrap DELETE + INSERT + the ingestion_run row in ONE transaction per run.
--   * WRITER ROLE: schedule the pg_cron job as table owner / service_role, else deny-all RLS eats every
--     INSERT. Verify one manual run lands rows before trusting the schedule.
--   * If any ON CONFLICT path is used for the fixed-set topic_trend, the arbiter is the COLUMN LIST
--     (subject_level, subject_id, window_type, as_of_date), NOT the index name (these are indexes, not
--     named constraints).

begin;

-- topic_trend: one (subject, window, as_of_date) snapshot of a theme's trajectory.
-- V1 populates subject_level='cluster' (the 30 themes); topic-level supported, deferred.
create table if not exists signal.topic_trend (
  trend_id               uuid primary key default gen_random_uuid(),
  subject_level          text not null check (subject_level in ('topic','cluster')),
  subject_id             uuid not null,                       -- topic_id or cluster_id (polymorphic; no FK, mirrors relations)
  window_type            text not null check (window_type in ('week','month','all_time')),
  as_of_date             date not null,
  event_count            int  not null default 0,
  distinct_speaker_count int  not null default 0,
  prior_event_count      int,                                 -- same-length preceding window (NULL for all_time)
  momentum               numeric,                             -- (event_count - prior)/greatest(prior,1)
  trend_label            text check (trend_label in ('heating','steady','cooling','new','insufficient_data')),
  is_low_confidence      boolean not null default false,      -- event_count below min-n guard, or week window
  source                 text not null default 'computed',
  content_hash           text not null,                       -- hash of computation inputs (idempotency/lineage)
  ingestion_run_id       uuid not null references signal.ingestion_run(run_id),
  computed_at            timestamptz not null default now(),
  created_at             timestamptz not null default now(),
  constraint topic_trend_content_hash_nonempty check (content_hash <> '')   -- NOT NULL admits ''; close it
);
create unique index if not exists topic_trend_grain_uq
  on signal.topic_trend(subject_level, subject_id, window_type, as_of_date);
create index if not exists topic_trend_asof
  on signal.topic_trend(as_of_date desc, window_type);
alter table signal.topic_trend enable row level security;

-- topic_pair_metric: one canonical-ordered theme pair per (window, as_of_date).
-- Unifies co-occurrence (shared events) and bridges (shared speakers) — two projections
-- of the same pair space. bridge_entity_ids[] keeps "who to know" joinable (normalized
-- topic_bridge_member is the scale path, MT-8).
create table if not exists signal.topic_pair_metric (
  pair_metric_id           uuid primary key default gen_random_uuid(),
  subject_level            text not null check (subject_level in ('topic','cluster')),
  subject_a_id             uuid not null,
  subject_b_id             uuid not null,
  window_type              text not null check (window_type in ('week','month','all_time')),
  as_of_date               date not null,
  cooccurrence_event_count int  not null default 0,           -- shared events
  bridge_person_count      int  not null default 0,           -- shared speakers
  bridge_entity_ids        uuid[] not null default '{}',      -- who bridges (targeting payload)
  first_cooccurred_on      date,                              -- earliest shared-event date (novelty)
  is_new_pair              boolean not null default false,    -- first co-occ inside window
  intersection_score       numeric,                           -- cooc + 2*bridge + novelty_bonus (tunable)
  source                   text not null default 'computed',
  content_hash             text not null,
  ingestion_run_id         uuid not null references signal.ingestion_run(run_id),
  computed_at              timestamptz not null default now(),
  created_at               timestamptz not null default now(),
  constraint topic_pair_order check (subject_a_id < subject_b_id),  -- canonical order: no self-pairs, no dupes
  constraint topic_pair_content_hash_nonempty check (content_hash <> ''),
  -- bridge count must equal the array it summarizes (catches C3 dedup/skew bugs; suppression is view-layer,
  -- so base-table count == cardinality). C3 SQL must build the array with array_agg(distinct …).
  constraint topic_pair_bridge_count_matches check (bridge_person_count = cardinality(bridge_entity_ids))
);
create unique index if not exists topic_pair_grain_uq
  on signal.topic_pair_metric(subject_level, subject_a_id, subject_b_id, window_type, as_of_date);
create index if not exists topic_pair_asof
  on signal.topic_pair_metric(as_of_date desc, window_type);
create index if not exists topic_pair_bridge_gin
  on signal.topic_pair_metric using gin (bridge_entity_ids);
alter table signal.topic_pair_metric enable row level security;

commit;
