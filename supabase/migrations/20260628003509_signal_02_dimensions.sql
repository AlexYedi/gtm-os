-- entities: canonical person OR company (polymorphic dimension), SCD Type-1
create table signal.entities (
  entity_id               uuid primary key default gen_random_uuid(),
  entity_type             text not null check (entity_type in ('person','company')),
  display_name            text not null,
  normalized_name         citext not null,
  email_lower             citext,
  linkedin_url_normalized text,
  current_title           text,
  company_domain          citext,
  funding_stage           text check (funding_stage in ('pre_seed','seed','series_a','series_b','series_c','series_d_plus','public','bootstrapped','unknown')),
  industry                text,
  source                  text not null,
  source_record_id        text,
  content_hash            text,
  fetched_at              timestamptz not null,
  last_verified_at        timestamptz not null,
  last_modified_at        timestamptz not null default now(),
  ingestion_run_id        uuid not null references signal.ingestion_run(run_id),
  created_at              timestamptz not null default now(),
  constraint entities_identity_present check (source_record_id is not null or content_hash is not null)
);
create unique index entities_email_uq    on signal.entities(email_lower) where email_lower is not null;
create unique index entities_linkedin_uq on signal.entities(linkedin_url_normalized) where linkedin_url_normalized is not null;
create unique index entities_domain_uq   on signal.entities(company_domain) where entity_type='company' and company_domain is not null;
create index entities_name_trgm on signal.entities using gin ((normalized_name::text) gin_trgm_ops);
create index entities_type      on signal.entities(entity_type);

-- cross-system identity xref (Notion/HubSpot/Apollo <-> spine)
create table signal.entity_external_ids (
  entity_id   uuid not null references signal.entities(entity_id) on delete cascade,
  source      text not null,
  external_id text not null,
  created_at  timestamptz not null default now(),
  primary key (source, external_id)
);
create index entity_external_ids_entity on signal.entity_external_ids(entity_id);

-- events dimension
create table signal.events (
  event_id          uuid primary key default gen_random_uuid(),
  event_slug        text not null unique,
  title             text not null,
  event_date        date not null,
  venue             text,
  event_status      text not null check (event_status in ('intake','researched','content_drafted','attended','post_complete','not_attending')),
  is_talent_density boolean not null default false,
  expected_dm_count int,
  source            text not null,
  source_record_id  text,
  content_hash      text,
  fetched_at        timestamptz not null,
  last_verified_at  timestamptz not null,
  last_modified_at  timestamptz not null default now(),
  ingestion_run_id  uuid not null references signal.ingestion_run(run_id),
  created_at        timestamptz not null default now(),
  constraint events_identity_present check (source_record_id is not null or content_hash is not null)
);
create unique index events_source_record_uq on signal.events(source, source_record_id) where source_record_id is not null;
create index events_date   on signal.events(event_date);
create index events_status on signal.events(event_status);

-- topics dimension (Signals 4 & 5); synonym_set is load-bearing
create table signal.topics (
  topic_id         uuid primary key default gen_random_uuid(),
  canonical_slug   text not null unique,
  display_name     text not null,
  synonym_set      jsonb not null default '[]'::jsonb,
  source           text not null,
  source_record_id text,
  content_hash     text,
  fetched_at       timestamptz not null,
  last_verified_at timestamptz not null,
  last_modified_at timestamptz not null default now(),
  ingestion_run_id uuid not null references signal.ingestion_run(run_id),
  created_at       timestamptz not null default now(),
  constraint topics_identity_present check (source_record_id is not null or content_hash is not null)
);
create unique index topics_source_record_uq on signal.topics(source, source_record_id) where source_record_id is not null;
create index topics_synonyms on signal.topics using gin (synonym_set jsonb_path_ops);

alter table signal.entities            enable row level security;
alter table signal.entity_external_ids enable row level security;
alter table signal.events              enable row level security;
alter table signal.topics              enable row level security;
