-- signals: the fact table. grain = (signal_type, subject, context)
create table signal.signals (
  signal_id        uuid primary key default gen_random_uuid(),
  signal_type      text not null check (signal_type in (
                     'shared_event_attendance','speaker_host_status','talent_density_event',
                     'same_day_cross_event_pairing','topic_intersection','event_conversation_count','dm_reply')),
  subject_entity_id uuid references signal.entities(entity_id),
  event_id          uuid references signal.events(event_id),
  related_event_id  uuid references signal.events(event_id),
  topic_id          uuid references signal.topics(topic_id),
  related_topic_id  uuid references signal.topics(topic_id),
  score             numeric,
  status            text not null check (status in ('pending','active','actioned','suppressed','expired')) default 'pending',
  payload           jsonb not null default '{}'::jsonb,
  idempotency_key   text not null unique,
  detected_at       timestamptz not null default now(),
  source            text not null,
  source_record_id  text,
  content_hash      text,
  last_modified_at  timestamptz not null default now(),
  ingestion_run_id  uuid not null references signal.ingestion_run(run_id),
  created_at        timestamptz not null default now(),
  constraint signals_identity_present check (source_record_id is not null or content_hash is not null)
);
create index signals_type_detected on signal.signals(signal_type, detected_at desc);
create index signals_subject       on signal.signals(subject_entity_id);
create index signals_event         on signal.signals(event_id);
create index signals_pending       on signal.signals(status) where status='pending';

-- relations: polymorphic typed-edge graph (entity/event/topic). FK integrity by resolver + audit job.
create table signal.relations (
  relation_id      uuid primary key default gen_random_uuid(),
  from_type        text not null check (from_type in ('entity','event','topic')),
  from_id          uuid not null,
  to_type          text not null check (to_type in ('entity','event','topic')),
  to_id            uuid not null,
  relation_type    text not null check (relation_type in (
                     'attended','speaker_at','host_of','panelist_at','works_at','tagged_topic','co_event','related_topic')),
  role_context     text,
  met_in_person    boolean,
  is_active        boolean not null default true,
  valid_from       timestamptz,
  valid_to         timestamptz,
  source           text not null,
  source_record_id text,
  content_hash     text,
  last_modified_at timestamptz not null default now(),
  ingestion_run_id uuid not null references signal.ingestion_run(run_id),
  created_at       timestamptz not null default now(),
  constraint relations_identity_present check (source_record_id is not null or content_hash is not null)
);
create unique index relations_edge_uq on signal.relations(from_type, from_id, to_type, to_id, relation_type);
create index relations_from        on signal.relations(from_type, from_id);
create index relations_to          on signal.relations(to_type, to_id);
create index relations_type_active on signal.relations(relation_type) where is_active;

alter table signal.signals   enable row level security;
alter table signal.relations enable row level security;
