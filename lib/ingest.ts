// events_pipeline source contract (architecture §3.12, §5): dimensions + relations, idempotent.
// Write order: ingestion_run -> entities/entity_external_ids/provenance -> events -> topics ->
// relations -> source_state. NO signals here (see derive.ts). Run control wraps the whole batch.
import { sel, ins, patch, SOURCE_EVENTS } from './spine'
import { slug, sha, roleToRelation } from './normalize'
import { resolveEntity, addProvenance } from './resolve'
import type { EventsDump, EventRec, TopicRec } from './reader'

async function upsertEvent(ev: EventRec, runId: string, now: string): Promise<{ id: string; created: boolean }> {
  const found = await sel(`events?source=eq.${SOURCE_EVENTS}&source_record_id=eq.${ev.notion_id}&select=event_id`)
  if (found.length) return { id: found[0].event_id, created: false }
  const e = await ins('events', {
    event_slug: slug(`${ev.event_date}-${ev.name}`), title: ev.name, event_date: ev.event_date,
    venue: ev.location ?? null, event_status: ev.status, source: SOURCE_EVENTS, source_record_id: ev.notion_id,
    fetched_at: now, last_verified_at: now, ingestion_run_id: runId,
  })
  await addProvenance('event', e.event_id, ev.notion_id, runId, now)
  return { id: e.event_id, created: true }
}

async function upsertTopic(t: TopicRec, runId: string, now: string): Promise<{ id: string; created: boolean }> {
  const found = await sel(`topics?source=eq.${SOURCE_EVENTS}&source_record_id=eq.${t.notion_id}&select=topic_id`)
  if (found.length) return { id: found[0].topic_id, created: false }
  const tp = await ins('topics', {
    canonical_slug: slug(t.topic), display_name: t.topic, source: SOURCE_EVENTS, source_record_id: t.notion_id,
    fetched_at: now, last_verified_at: now, ingestion_run_id: runId,
  })
  await addProvenance('topic', tp.topic_id, t.notion_id, runId, now)
  return { id: tp.topic_id, created: true }
}

async function addRelation(fromType: string, fromId: string, toType: string, toId: string, relType: string, runId: string, roleContext?: string): Promise<boolean> {
  const found = await sel(`relations?from_type=eq.${fromType}&from_id=eq.${fromId}&to_type=eq.${toType}&to_id=eq.${toId}&relation_type=eq.${relType}&select=relation_id`)
  if (found.length) return false
  await ins('relations', {
    from_type: fromType, from_id: fromId, to_type: toType, to_id: toId, relation_type: relType,
    role_context: roleContext ?? null, source: SOURCE_EVENTS,
    content_hash: sha(`${fromType}:${fromId}:${toType}:${toId}:${relType}`), ingestion_run_id: runId,
  })
  return true
}

export interface IngestSummary { runId: string; written: number; seen: number }

export async function runIngest(dump: EventsDump): Promise<IngestSummary> {
  const now = new Date().toISOString()
  const prior = await sel(`source_state?source=eq.${SOURCE_EVENTS}&select=last_watermark`)
  const watermarkBefore = prior[0]?.last_watermark ?? null
  const runRow = await ins('ingestion_run', {
    source: SOURCE_EVENTS, runtime: 'manual', status: 'running', started_at: now,
    watermark_before: watermarkBefore, records_seen: dump.events.length,
  })
  const runId = runRow.run_id
  let written = 0
  try {
    const peopleById = Object.fromEntries(dump.people.map(p => [p.notion_id, p]))
    const companiesById = Object.fromEntries(dump.companies.map(c => [c.notion_id, c]))
    const topicsById = Object.fromEntries(dump.topics.map(t => [t.notion_id, t]))
    const cache: Record<string, string> = {}
    const ensure = async (kind: 'person' | 'company', id: string, rec: any): Promise<string> => {
      if (cache[id]) return cache[id]
      const { entityId, created } = await resolveEntity(kind, rec, runId, now)
      if (created) written++
      cache[id] = entityId
      return entityId
    }

    for (const ev of dump.events) {
      const { id: eventId, created } = await upsertEvent(ev, runId, now); if (created) written++
      for (const pid of ev.people) {
        const p = peopleById[pid]; if (!p) continue
        const personId = await ensure('person', pid, p)
        if (await addRelation('entity', personId, 'event', eventId, roleToRelation(p.roles ?? []), runId, (p.roles ?? []).join(','))) written++
        if (p.company_notion_id && companiesById[p.company_notion_id]) {
          const coId = await ensure('company', p.company_notion_id, companiesById[p.company_notion_id])
          if (await addRelation('entity', personId, 'entity', coId, 'works_at', runId)) written++
        }
      }
      for (const cid of ev.companies) if (companiesById[cid]) await ensure('company', cid, companiesById[cid])
      for (const tid of ev.topics) {
        const t = topicsById[tid]; if (!t) continue
        const { id: topicId, created: tc } = await upsertTopic(t, runId, now); if (tc) written++
        if (await addRelation('event', eventId, 'topic', topicId, 'tagged_topic', runId)) written++
      }
    }

    const watermarkAfter = dump.events.map(e => e.created_time).sort().at(-1) ?? watermarkBefore
    const existing = await sel(`source_state?source=eq.${SOURCE_EVENTS}&select=source`)
    if (existing.length) await patch('source_state', `source=eq.${SOURCE_EVENTS}`, { last_watermark: watermarkAfter, last_run_id: runId, last_success_at: now })
    else await ins('source_state', { source: SOURCE_EVENTS, last_watermark: watermarkAfter, last_run_id: runId, last_success_at: now })

    await patch('ingestion_run', `run_id=eq.${runId}`, { status: 'success', finished_at: new Date().toISOString(), records_written: written, watermark_after: watermarkAfter })
    return { runId, written, seen: dump.events.length }
  } catch (e) {
    await patch('ingestion_run', `run_id=eq.${runId}`, { status: 'failed', finished_at: new Date().toISOString(), error_detail: String(e) })
    throw e
  }
}
