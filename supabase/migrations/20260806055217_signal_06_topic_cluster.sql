-- signal_06 — topic-intelligence layer, Slice 0 (YED-110)
-- Adds the canonical THEME dimension (topic_cluster) + non-destructive theme
-- membership columns on topics. Slice 0 only: the computed substrate tables
-- (topic_trend, topic_pair_metric) land in signal_07 with Slice 1.
-- Spec: Phase_1/topic_intelligence_spec.md §2.1–2.2 · Architecture: Phase_1/architecture.md §0.6 (V2.2)
--
-- Reviewed by alex:cto-principal-architect (2026-08-06) — GO-WITH-CHANGES, folded in:
--   P1 provenance: source has NO default (matches entities/events/topics), value 'topic_curation';
--      identity anchors on source_record_id = canonical_slug (the natural key), NOT sha256(slug),
--      so content_hash is preserved for genuine edit-detection. House-standard (source,source_record_id) uq index.
--   P2 atomicity: wrapped in begin/commit (apply during an ingestion-quiet window — brief
--      ACCESS EXCLUSIVE on topics; see apply notes).
--   P3 self-parent cycle guard on parent_cluster_id.
--   P4 FK ON DELETE NO ACTION is intentional — cluster lifecycle is deprecation
--      (curation_status='deprecated'), never row deletion.
--   P5 numeric(4,3) confidence; partial index on assigned topics only.
-- Deliberate deviations (also reviewed, kept): IF NOT EXISTS / drop-then-add idempotency for
--   manual re-run safety; confidence range CHECK enforcing documented 0..1 semantics.
--
-- APPLY: paste whole file into the Supabase SQL editor (runs atomically as one transaction).
--   If applying via `supabase db push` instead, remove the begin/commit wrapper (the CLI
--   manages the migration transaction itself).

begin;

-- topic_cluster: canonical THEME dimension (the theme -> topic rollup).
-- Non-destructive: topics keep their atomic identity; cluster_id points here.
-- Insert convention (bootstrap script, not this migration): source='topic_curation',
--   source_record_id=canonical_slug, content_hash = digest(slug+name+description) or NULL,
--   ingestion_run_id = a manual bootstrap run (ingestion_run.runtime already allows 'manual').
create table if not exists signal.topic_cluster (
  cluster_id        uuid primary key default gen_random_uuid(),
  canonical_slug    text not null unique,                 -- 'agentic-commerce-payments'
  display_name      text not null,                        -- 'Agentic Commerce & Payments'
  description       text,                                 -- editorial one-liner (content voice)
  parent_cluster_id uuid references signal.topic_cluster(cluster_id),  -- reserved; NULL in V1
  curation_status   text not null default 'proposed'
                      check (curation_status in ('proposed','approved','deprecated')),
  curated_by        text,                                 -- 'alex' | 'llm'
  source            text not null,                        -- no default (house pattern); 'topic_curation'
  source_record_id  text,                                 -- = canonical_slug (natural key)
  content_hash      text,                                 -- reserved for a true content digest
  fetched_at        timestamptz not null default now(),
  last_verified_at  timestamptz not null default now(),
  last_modified_at  timestamptz not null default now(),
  ingestion_run_id  uuid not null references signal.ingestion_run(run_id),
  created_at        timestamptz not null default now(),
  constraint topic_cluster_identity check (source_record_id is not null or content_hash is not null),
  constraint topic_cluster_no_self_parent check (parent_cluster_id is null or parent_cluster_id <> cluster_id)
);
alter table signal.topic_cluster enable row level security;

create unique index if not exists topic_cluster_source_record_uq
  on signal.topic_cluster(source, source_record_id) where source_record_id is not null;

create or replace trigger set_modtime before update on signal.topic_cluster
  for each row execute function extensions.moddatetime(last_modified_at);

-- topics: non-destructive theme-membership columns (nullable FK = topic can be
-- unassigned/pending review without blocking ingestion). Single-membership in V1.
alter table signal.topics
  add column if not exists cluster_id                    uuid references signal.topic_cluster(cluster_id),
  add column if not exists cluster_assignment_confidence numeric(4,3),
  add column if not exists cluster_assigned_by           text;

alter table signal.topics
  drop constraint if exists topics_cluster_confidence_range;
alter table signal.topics
  add constraint topics_cluster_confidence_range
  check (cluster_assignment_confidence is null
         or (cluster_assignment_confidence >= 0 and cluster_assignment_confidence <= 1));

create index if not exists topics_cluster
  on signal.topics(cluster_id) where cluster_id is not null;

commit;
