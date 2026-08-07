-- signal_08 — Slice 1 Section B (gtm-os side): the signal_read view contract (YED-122)
-- The published, Hub-facing API. Base signal.* tables stay RLS-deny to anon; the Hub reads
-- ONLY these curated views. Views are SECURITY DEFINER by default (PG15) — they run as the
-- owner (postgres), which bypasses RLS on the base tables, so anon reads the view without ever
-- touching signal.*. Do NOT set security_invoker=true (that would run as anon -> empty results).
-- Spec: topic_intelligence_spec.md §5 · contract: gtm-os-hub/ARCHITECTURE.md §9 · memory: topic-intelligence-slice1-view-constraint
--
-- ⚠️ TWO GATES BEFORE ANYTHING IS PUBLIC (neither is in this migration):
--   1. v_bridge_people exposes PEOPLE. It is NOT anon-granted here. Grant it to anon ONLY AFTER
--      signal.suppression is seeded (current employer, active pipeline) — otherwise it would
--      publicly expose every bridge person. With 0 suppression rows today it returns everyone,
--      which is exactly why the anon grant is withheld.
--   2. REST exposure: anon reaches signal_read only once the schema is added to PostgREST's
--      exposed schemas (Dashboard → Settings → API → Exposed schemas: add `signal_read`).
--      Until then these views are reachable by service_role only, same as the base tables.
--
-- APPLY: paste into the Supabase SQL editor (atomic). Via `supabase db push`, drop begin/commit.

begin;

create schema if not exists signal_read;
grant usage on schema signal_read to anon, authenticated, service_role;

-- extend suppression reasons with the public opt-out (spec §5). Drop the existing reason CHECK
-- BY DEFINITION (not a guessed name) so a differently-named constraint can't leave a silent
-- double-CHECK. 0 rows, so no validation pass needed.
do $$
declare cn text;
begin
  for cn in
    select conname from pg_constraint
    where conrelid = 'signal.suppression'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%reason%'
  loop
    execute format('alter table signal.suppression drop constraint %I', cn);
  end loop;
end $$;
alter table signal.suppression add constraint suppression_reason_check
  check (reason in ('current_employer','active_pipeline','personal_contact','opt_out',
                    'cold','competitor','in_flight_activation','public_exclude','other'));

-- ── PUBLIC-SAFE: theme movement (no PII) ────────────────────────────────────────────
create or replace view signal_read.v_topic_movement as
select c.canonical_slug, c.display_name as theme, tt.window_type,
       tt.event_count, tt.distinct_speaker_count, tt.momentum,
       tt.trend_label, tt.is_low_confidence, tt.as_of_date
from signal.topic_trend tt
join signal.topic_cluster c on c.cluster_id = tt.subject_id
where tt.subject_level='cluster'
  and tt.window_type in ('month','all_time')          -- V1 surfaces month + all_time; week stays internal
  and tt.as_of_date = (select max(as_of_date) from signal.topic_trend);

-- ── PUBLIC-SAFE: theme intersections — COUNTS ONLY, never the entity arrays ──────────
create or replace view signal_read.v_topic_intersections as
select ca.display_name as theme_a, cb.display_name as theme_b, tpm.window_type,
       tpm.cooccurrence_event_count, tpm.bridge_person_count,
       tpm.is_new_pair, tpm.intersection_score, tpm.as_of_date
from signal.topic_pair_metric tpm
join signal.topic_cluster ca on ca.cluster_id = tpm.subject_a_id
join signal.topic_cluster cb on cb.cluster_id = tpm.subject_b_id
where tpm.subject_level='cluster'
  and tpm.window_type in ('month','all_time')
  and tpm.as_of_date = (select max(as_of_date) from signal.topic_pair_metric);   -- own watermark (review #2)
  -- NB: bridge_entity_ids (the WHO) is deliberately not selected here — that's v_bridge_people's job, gated.
  -- DEFERRED (review #3): bridge_person_count is NOT suppression-adjusted. At the v_bridge_people
  -- anon-grant gate (after suppression is seeded), mask small cells (k<2) or subtract suppressed
  -- members here, so a k=1 count can't re-identify a suppressed person.

-- ── PII-GATED: named bridge people — suppression-filtered, name + public title + themes ONLY ──
create or replace view signal_read.v_bridge_people as
select e.display_name, e.current_title,
       ca.display_name as theme_a, cb.display_name as theme_b, tpm.as_of_date
from signal.topic_pair_metric tpm
cross join lateral unnest(tpm.bridge_entity_ids) as be(entity_id)
join signal.entities e      on e.entity_id  = be.entity_id
join signal.topic_cluster ca on ca.cluster_id = tpm.subject_a_id
join signal.topic_cluster cb on cb.cluster_id = tpm.subject_b_id
left join signal.suppression s on s.entity_id = e.entity_id
       and (s.expires_at is null or s.expires_at > now())      -- active suppressions only
where tpm.subject_level='cluster' and tpm.window_type='all_time'
  and tpm.as_of_date = (select max(as_of_date) from signal.topic_pair_metric)   -- own watermark (review #2)
  and s.suppression_id is null;                                -- exclude anyone actively suppressed
  -- Exposes name + public title + bridged themes. NEVER email_lower / linkedin_url_normalized / phone.

-- ── GRANTS ──────────────────────────────────────────────────────────────────────────
-- public-safe views: anon-grantable (mirrors learning.* v_public_* pattern)
grant select on signal_read.v_topic_movement     to anon, authenticated, service_role;
grant select on signal_read.v_topic_intersections to anon, authenticated, service_role;
-- v_bridge_people: service_role ONLY. Add `grant select ... to anon` in a follow-up
-- migration AFTER signal.suppression is seeded + reviewed. Withheld deliberately.
grant select on signal_read.v_bridge_people to service_role;

commit;
