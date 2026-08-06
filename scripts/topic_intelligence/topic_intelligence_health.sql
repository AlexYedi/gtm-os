-- topic_intelligence_health.sql — Slice 1 Section A, Step 5 (YED-120)
-- The "V1 assumptions" strip (spec §8): one row per tripwire, each a measurable that flips
-- from ok -> watch -> trip when a V1 simplification stops being good enough. The Hub renders
-- this on the dashboard (Section B); until then it's queryable directly.
-- Reads the computed tables + dimensions; no writes. Reapply with CREATE OR REPLACE.

create or replace view signal.topic_intelligence_health as
with
latest as (select max(as_of_date) as d from signal.topic_trend),
tagged_events as (   -- total distinct events that carry any theme (denominator for occupancy)
  select count(distinct r.from_id) as n
  from signal.relations r join signal.topics t on t.topic_id = r.to_id
  where r.relation_type='tagged_topic' and r.from_type='event' and r.to_type='topic'
    and r.is_active and t.cluster_id is not null
),
-- (1) granularity: largest theme's share of all-time events (catch-all guard)
occupancy as (
  select max(tt.event_count)::numeric / greatest((select n from tagged_events),1) as v
  from signal.topic_trend tt, latest
  where tt.window_type='all_time' and tt.subject_level='cluster' and tt.as_of_date=latest.d
),
-- (2) granularity: share of month-window themes stuck at insufficient_data (thin-data / stale-corpus)
insuff as (
  select avg((tt.trend_label='insufficient_data')::int)::numeric as v
  from signal.topic_trend tt, latest
  where tt.window_type='month' and tt.subject_level='cluster' and tt.as_of_date=latest.d
),
-- (3) single-membership pressure: topics assigned with low confidence (likely bi-thematic)
membership as (
  select avg((cluster_assignment_confidence < 0.80)::int)::numeric as v
  from signal.topics where cluster_id is not null
),
-- (4) canonicalization: topics unassigned + conflicts awaiting a human (climbing => promote to embeddings)
canon as (
  select (select count(*) from signal.topics where cluster_id is null)
       + (select count(*) from signal.conflict_log where resolution='human_pending') as v
),
-- (5) runtime: largest gap (days) between consecutive trend snapshots (heartbeat / pg_cron health)
gaps as (
  select coalesce(max(gap),0) as v from (
    select as_of_date - lag(as_of_date) over (order by as_of_date) as gap
    from (select distinct as_of_date from signal.topic_trend) s
  ) g
),
-- (6) bridge inflation: worst bridge:co-occurrence ratio among all-time pairs that share an event
bridge as (
  select coalesce(max(bridge_person_count::numeric / cooccurrence_event_count),0) as v
  from signal.topic_pair_metric tpm, latest
  where tpm.window_type='all_time' and tpm.as_of_date=latest.d and tpm.cooccurrence_event_count > 0
)
select * from (
  values
  ('granularity_occupancy',  'D2', (select round(v,3) from occupancy),  0.200,
     'largest theme share of all-time events'),
  ('granularity_insufficient','D2',(select round(v,3) from insuff),      0.400,
     'month-window themes at insufficient_data'),
  ('membership_confidence',   'D1', (select round(v,3) from membership),  0.150,
     'topics assigned below 0.80 confidence'),
  ('canonicalization_backlog','MT-7',(select v::numeric from canon),      5.000,
     'unassigned topics + human_pending conflicts (0 = ok; climbing => promote to embeddings)'),
  ('runtime_snapshot_gap',    'D4', (select v::numeric from gaps),        1.000,
     'max days between trend snapshots'),
  ('bridge_inflation',        'B',  (select round(v,2) from bridge),     10.000,
     'worst bridge:co-occurrence ratio')
) as h(tripwire, decision, metric, threshold, description)
cross join lateral (
  select case
    when h.metric is null then 'no_data'
    when h.metric >  h.threshold then 'trip'
    when h.metric >= h.threshold * 0.75 then 'watch'
    else 'ok'
  end as status
) s;

comment on view signal.topic_intelligence_health is
  'V1-assumptions tripwire strip (spec §8): one row per simplification, status ok/watch/trip vs threshold.';
