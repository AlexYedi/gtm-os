// The shared entity resolver (architecture §2.1). Idempotency via entity_external_ids, then the
// email-less natural-key ladder (linkedin / company_domain). One function for both ingest layers.
import { sel, ins, SOURCE_EVENTS } from './spine'
import { normName, normLinkedin, domainOf, FUNDING } from './normalize'
import type { PersonRec, CompanyRec } from './reader'

// merge priority for provenance (hygiene §4.1: notion_manual=1; events_pipeline is first-party automated)
const SRC_PRIORITY = 2

export async function addProvenance(targetType: string, targetId: string, notionId: string, runId: string, now: string) {
  await ins('provenance', {
    target_type: targetType, target_id: targetId, source: SOURCE_EVENTS, source_record_id: notionId,
    source_priority: SRC_PRIORITY, fetched_at: now, last_verified_at: now, ingestion_run_id: runId,
  })
}

/** Resolve (or create) a person/company entity. Returns {entityId, created}. Always records the
 *  (source, notion_id) mapping in entity_external_ids — the idempotency anchor for re-runs. */
export async function resolveEntity(
  kind: 'person' | 'company', rec: PersonRec | CompanyRec, runId: string, now: string,
): Promise<{ entityId: string; created: boolean }> {
  // 0. idempotency: already mapped this exact Notion record?
  const mapped = await sel(`entity_external_ids?source=eq.${SOURCE_EVENTS}&external_id=eq.${rec.notion_id}&select=entity_id`)
  if (mapped.length) return { entityId: mapped[0].entity_id, created: false }

  // 1. natural-key ladder (cross-source dedup; catches same entity under a new notion id)
  let entityId: string | null = null
  if (kind === 'person') {
    const lk = normLinkedin((rec as PersonRec).linkedin)
    if (lk) { const m = await sel(`entities?linkedin_url_normalized=eq.${encodeURIComponent(lk)}&select=entity_id`); if (m.length) entityId = m[0].entity_id }
  } else {
    const dom = domainOf((rec as CompanyRec).website)
    if (dom) { const m = await sel(`entities?entity_type=eq.company&company_domain=eq.${encodeURIComponent(dom)}&select=entity_id`); if (m.length) entityId = m[0].entity_id }
  }

  // 2. create
  let created = false
  if (!entityId) {
    const row: Record<string, unknown> = {
      entity_type: kind, display_name: rec.name, normalized_name: normName(rec.name),
      source: SOURCE_EVENTS, source_record_id: rec.notion_id, fetched_at: now, last_verified_at: now, ingestion_run_id: runId,
    }
    if (kind === 'person') { const p = rec as PersonRec; row.linkedin_url_normalized = normLinkedin(p.linkedin); row.current_title = p.title ?? null }
    else { const c = rec as CompanyRec; row.company_domain = domainOf(c.website); row.funding_stage = (c.funding_stage && FUNDING[c.funding_stage]) || 'unknown'; row.industry = c.industry?.[0] ?? null }
    const e = await ins('entities', row)
    entityId = e.entity_id
    created = true
    await addProvenance('entity', entityId!, rec.notion_id, runId, now)
  }

  await ins('entity_external_ids', { entity_id: entityId, source: SOURCE_EVENTS, external_id: rec.notion_id })
  return { entityId: entityId!, created }
}
