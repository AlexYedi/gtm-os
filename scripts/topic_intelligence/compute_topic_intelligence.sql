-- compute_topic_intelligence.sql — Slice 1 Section A, Steps 3–4 (YED-120)
-- The nightly computation: reloads topic_trend + topic_pair_metric for one as_of_date.
-- Cluster-level (V1); windows month(30d) / week(7d) / all_time. Idempotent DELETE-reload
-- inside one transaction (the function body). pg_cron calls: select signal.compute_topic_intelligence();
--
-- Write contract (cto review, signal_07 header): DELETE-by-as_of_date + INSERT, atomic, writer =
-- table owner/service_role. Bridges use array_agg(distinct …) so bridge_person_count = cardinality(arr)
-- (enforced by the topic_pair_bridge_count_matches CHECK).
--
-- Edge encodings (verified live): tagged_topic = event->topic; speaker edges = entity->event with
-- relation_type in (speaker_at, host_of, panelist_at). trend_label per spec §3.2.
-- STATUS: authored; MANUAL TEST REQUIRED after signal_07 applies (run once, compare to the client-side
-- reference before wiring pg_cron). Not yet scheduled.

create or replace function signal.compute_topic_intelligence(
  p_as_of   date default current_date,
  p_runtime text default 'pg_cron'
) returns uuid
language plpgsql
as $fn$
declare
  v_run_id uuid;
  w        record;
begin
  insert into signal.ingestion_run (source, runtime, status, started_at)
  values ('computed', p_runtime, 'running', now())
  returning run_id into v_run_id;

  -- RELOAD: clear only this as_of_date (never prior dates)
  delete from signal.topic_trend       where as_of_date = p_as_of;
  delete from signal.topic_pair_metric where as_of_date = p_as_of;

  for w in
    select window_type, days
    from (values ('month', 30), ('week', 7), ('all_time', null::int)) as t(window_type, days)
  loop
    -----------------------------------------------------------------------
    -- TREND (cluster level)
    -----------------------------------------------------------------------
    insert into signal.topic_trend (
      subject_level, subject_id, window_type, as_of_date,
      event_count, distinct_speaker_count, prior_event_count, momentum,
      trend_label, is_low_confidence, source, content_hash, ingestion_run_id)
    with tagged as (
      select t.cluster_id, e.event_id, e.event_date
      from signal.relations r
      join signal.events e on e.event_id = r.from_id
      join signal.topics  t on t.topic_id = r.to_id
      where r.relation_type='tagged_topic' and r.from_type='event' and r.to_type='topic' and r.is_active
        and t.cluster_id is not null
        and (w.days is null or e.event_date >= p_as_of - make_interval(days => w.days))
    ),
    this_w as (
      select cluster_id, count(distinct event_id) as ec from tagged group by cluster_id
    ),
    prior_w as (
      select t.cluster_id, count(distinct e.event_id) as pc
      from signal.relations r
      join signal.events e on e.event_id = r.from_id
      join signal.topics  t on t.topic_id = r.to_id
      where w.days is not null
        and r.relation_type='tagged_topic' and r.from_type='event' and r.to_type='topic' and r.is_active
        and t.cluster_id is not null
        and e.event_date >= p_as_of - make_interval(days => 2*w.days)
        and e.event_date <  p_as_of - make_interval(days => w.days)
      group by t.cluster_id
    ),
    spk as (
      select tg.cluster_id, count(distinct sp.from_id) as sc
      from tagged tg
      join signal.relations sp
        on sp.to_type='event' and sp.to_id = tg.event_id
       and sp.relation_type in ('speaker_at','host_of','panelist_at') and sp.is_active
      group by tg.cluster_id
    )
    select
      'cluster', tw.cluster_id, w.window_type, p_as_of,
      tw.ec,
      coalesce(s.sc, 0),
      case when w.days is null then null else coalesce(pw.pc, 0) end,
      case when w.days is null then null
           else (tw.ec - coalesce(pw.pc,0))::numeric / greatest(coalesce(pw.pc,0), 1) end,
      case
        when tw.ec < 3           then 'insufficient_data'
        when w.days is null      then 'steady'                       -- all_time: cumulative baseline, no momentum
        when coalesce(pw.pc,0)=0 then 'new'
        when (tw.ec - coalesce(pw.pc,0))::numeric/greatest(coalesce(pw.pc,0),1) >=  0.5 then 'heating'
        when (tw.ec - coalesce(pw.pc,0))::numeric/greatest(coalesce(pw.pc,0),1) <= -0.5 then 'cooling'
        else 'steady'
      end,
      (tw.ec < 3) or (w.window_type = 'week'),                       -- low-confidence: below min-n, or week (V1)
      'computed',
      md5(tw.cluster_id::text||'|'||w.window_type||'|'||p_as_of::text||'|'||tw.ec||'|'||coalesce(s.sc,0)||'|'||coalesce(pw.pc,0)),
      v_run_id
    from this_w tw
    left join prior_w pw on pw.cluster_id = tw.cluster_id
    left join spk     s  on s.cluster_id  = tw.cluster_id;

    -----------------------------------------------------------------------
    -- PAIRS: co-occurrence (shared events) + bridges (shared speakers)
    -----------------------------------------------------------------------
    insert into signal.topic_pair_metric (
      subject_level, subject_a_id, subject_b_id, window_type, as_of_date,
      cooccurrence_event_count, bridge_person_count, bridge_entity_ids,
      first_cooccurred_on, is_new_pair, intersection_score,
      source, content_hash, ingestion_run_id)
    with cluster_events as (
      select distinct t.cluster_id, e.event_id, e.event_date
      from signal.relations r
      join signal.events e on e.event_id = r.from_id
      join signal.topics  t on t.topic_id = r.to_id
      where r.relation_type='tagged_topic' and r.from_type='event' and r.to_type='topic' and r.is_active
        and t.cluster_id is not null
        and (w.days is null or e.event_date >= p_as_of - make_interval(days => w.days))
    ),
    cooc as (
      select ce1.cluster_id as a, ce2.cluster_id as b,
             count(distinct ce1.event_id) as cnt
      from cluster_events ce1
      join cluster_events ce2 on ce1.event_id = ce2.event_id and ce1.cluster_id < ce2.cluster_id
      group by ce1.cluster_id, ce2.cluster_id
    ),
    speaker_cluster as (
      select distinct sp.from_id as entity_id, t.cluster_id
      from signal.relations sp
      join signal.events e  on e.event_id = sp.to_id
      join signal.relations tt on tt.from_type='event' and tt.from_id = e.event_id
                              and tt.relation_type='tagged_topic' and tt.is_active
      join signal.topics t on t.topic_id = tt.to_id
      where sp.to_type='event'
        and sp.relation_type in ('speaker_at','host_of','panelist_at') and sp.is_active
        and t.cluster_id is not null
        and (w.days is null or e.event_date >= p_as_of - make_interval(days => w.days))
    ),
    bridges as (
      select sc1.cluster_id as a, sc2.cluster_id as b,
             count(distinct sc1.entity_id)      as bcnt,
             array_agg(distinct sc1.entity_id)  as barr
      from speaker_cluster sc1
      join speaker_cluster sc2 on sc1.entity_id = sc2.entity_id and sc1.cluster_id < sc2.cluster_id
      group by sc1.cluster_id, sc2.cluster_id
    ),
    all_time_first as (   -- correct novelty: earliest shared-event date per pair, all time
      select e1.a, e1.b, min(e1.event_date) as first_ever
      from (
        select ce_a.cluster_id as a, ce_b.cluster_id as b, ce_a.event_date
        from (select distinct t.cluster_id, e.event_id, e.event_date
              from signal.relations r
              join signal.events e on e.event_id=r.from_id
              join signal.topics t on t.topic_id=r.to_id
              where r.relation_type='tagged_topic' and r.from_type='event' and r.to_type='topic' and r.is_active
                and t.cluster_id is not null) ce_a
        join (select distinct t.cluster_id, e.event_id
              from signal.relations r
              join signal.events e on e.event_id=r.from_id
              join signal.topics t on t.topic_id=r.to_id
              where r.relation_type='tagged_topic' and r.from_type='event' and r.to_type='topic' and r.is_active
                and t.cluster_id is not null) ce_b
          on ce_a.event_id = ce_b.event_id and ce_a.cluster_id < ce_b.cluster_id
      ) e1 group by e1.a, e1.b
    )
    select
      'cluster',
      coalesce(c.a, b.a),
      coalesce(c.b, b.b),
      w.window_type, p_as_of,
      coalesce(c.cnt, 0),
      coalesce(b.bcnt, 0),
      coalesce(b.barr, '{}'::uuid[]),
      atf.first_ever,
      (w.days is not null and atf.first_ever is not null
        and atf.first_ever >= p_as_of - make_interval(days => w.days)),
      coalesce(c.cnt,0) + 2*coalesce(b.bcnt,0)
        + case when (w.days is not null and atf.first_ever is not null
                     and atf.first_ever >= p_as_of - make_interval(days => w.days)) then 2 else 0 end,
      'computed',
      md5(coalesce(c.a,b.a)::text||'|'||coalesce(c.b,b.b)::text||'|'||w.window_type||'|'||p_as_of::text
          ||'|'||coalesce(c.cnt,0)||'|'||coalesce(b.bcnt,0)||'|'||coalesce(atf.first_ever::text,'')),
      v_run_id
    from cooc c
    full outer join bridges b on c.a = b.a and c.b = b.b
    left join all_time_first atf
      on atf.a = coalesce(c.a, b.a) and atf.b = coalesce(c.b, b.b);

  end loop;

  update signal.ingestion_run set status='success', finished_at=now() where run_id = v_run_id;
  return v_run_id;
end;
$fn$;

-- Manual test after signal_07 applies (run as owner/service_role):
--   select signal.compute_topic_intelligence(current_date, 'manual');
-- Then inspect topic_trend / topic_pair_metric and diff against the client-side reference.
-- To schedule (Step 4, after a clean manual run):
--   select cron.schedule('topic-intel-nightly','30 3 * * *',
--     $$select signal.compute_topic_intelligence(current_date,'pg_cron')$$);
