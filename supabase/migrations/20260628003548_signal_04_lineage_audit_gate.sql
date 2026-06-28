-- provenance: one source-record observation contributing to one target row
create table signal.provenance (
  provenance_id    uuid primary key default gen_random_uuid(),
  target_type      text not null check (target_type in ('entity','event','topic','signal','relation')),
  target_id        uuid not null,
  source           text not null,
  source_record_id text,
  content_hash     text,
  source_priority  int not null,
  raw_payload      jsonb,
  fetched_at       timestamptz not null,
  last_verified_at timestamptz not null,
  ingestion_run_id uuid not null references signal.ingestion_run(run_id),
  created_at       timestamptz not null default now(),
  constraint provenance_identity_present check (source_record_id is not null or content_hash is not null)
);
create unique index provenance_uq on signal.provenance(target_type, target_id, source, source_record_id) where source_record_id is not null;
create index provenance_source_record on signal.provenance(source, source_record_id);
create index provenance_target        on signal.provenance(target_type, target_id);

-- conflict_log: append-only field-level conflict audit; only resolution columns mutable
create table signal.conflict_log (
  conflict_id      uuid primary key default gen_random_uuid(),
  target_type      text not null check (target_type in ('entity','event','topic','relation')),
  target_id        uuid not null,
  field_name       text not null,
  winning_source   text not null,
  winning_value    jsonb not null,
  winning_priority int  not null,
  losing_source    text not null,
  losing_value     jsonb not null,
  losing_priority  int  not null,
  resolution       text not null check (resolution in ('auto_priority','human_pending','human_resolved')) default 'auto_priority',
  resolved_at      timestamptz,
  resolved_by      text,
  detected_at      timestamptz not null default now(),
  ingestion_run_id uuid not null references signal.ingestion_run(run_id),
  created_at       timestamptz not null default now()
);
create index conflict_log_target  on signal.conflict_log(target_type, target_id);
create index conflict_log_pending on signal.conflict_log(resolution) where resolution='human_pending';

-- suppression: hard gate read by Phase 2 scoring BEFORE any score is computed
create table signal.suppression (
  suppression_id uuid primary key default gen_random_uuid(),
  entity_id      uuid not null references signal.entities(entity_id) on delete cascade,
  entity_type    text not null check (entity_type in ('person','company')),
  reason         text not null check (reason in (
                   'current_employer','active_pipeline','personal_contact','opt_out',
                   'cold','competitor','in_flight_activation','other')),
  reason_detail  text,
  added_at       timestamptz not null default now(),
  expires_at     timestamptz,
  added_by       text not null,
  created_at     timestamptz not null default now()
);
-- plain composite index (NOT a now()-predicated partial index: now() is non-IMMUTABLE
-- and Postgres rejects it in an index predicate); active-gate filtering happens at query time
create index suppression_entity on signal.suppression(entity_id, expires_at);

alter table signal.provenance   enable row level security;
alter table signal.conflict_log enable row level security;
alter table signal.suppression  enable row level security;
