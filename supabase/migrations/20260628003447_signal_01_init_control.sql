create schema if not exists signal;

create extension if not exists citext with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists fuzzystrmatch with schema extensions;
create extension if not exists moddatetime with schema extensions;

-- run control: one row per job execution; FK target for every ingestion_run_id
create table signal.ingestion_run (
  run_id           uuid primary key default gen_random_uuid(),
  source           text not null,
  runtime          text not null check (runtime in ('n8n','pg_cron','github_actions','manual','edge_function')),
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  status           text not null check (status in ('running','success','failed','partial')) default 'running',
  records_seen     int,
  records_written  int,
  watermark_before text,
  watermark_after  text,
  error_detail     text,
  created_at       timestamptz not null default now()
);
create index ingestion_run_source on signal.ingestion_run(source, started_at desc);

-- incremental watermark cursor: one row per source
create table signal.source_state (
  source          text primary key,
  last_watermark  text,
  last_run_id     uuid references signal.ingestion_run(run_id),
  last_success_at timestamptz,
  updated_at      timestamptz not null default now()
);

alter table signal.ingestion_run enable row level security;
alter table signal.source_state  enable row level security;
