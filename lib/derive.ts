// Signal derivation (architecture §3.5). App-code stand-in for the eventual pg_cron job — reads the
// relation graph and writes signal.signals. Idempotent via signals.idempotency_key.
//   Signal 1 shared_event_attendance : one per (person, event) edge (score 1).
//   Signal 2 speaker_host_status     : subset where the edge is speaker_at / host_of (score 3).
import { sel, ins, patch, SOURCE_COMPUTED } from './spine'
import { sha } from './normalize'

// idempotency_key = sha256(signal_type | subject | event | grain)
const idem = (type: string, subject: string, event: string) => sha(`${type}|${subject}|${event}`)

async function emit(type: string, subjectId: string, eventId: string, score: number, payload: unknown, runId: string, now: string): Promise<boolean> {
  const key = idem(type, subjectId, eventId)
  if ((await sel(`signals?idempotency_key=eq.${key}&select=signal_id`)).length) return false
  await ins('signals', {
    signal_type: type, subject_entity_id: subjectId, event_id: eventId, score, status: 'pending',
    payload, idempotency_key: key, detected_at: now, source: SOURCE_COMPUTED, content_hash: key, ingestion_run_id: runId,
  })
  return true
}

export interface DeriveSummary { runId: string; written: number; edges: number }

export async function deriveSignals(): Promise<DeriveSummary> {
  const now = new Date().toISOString()
  const runRow = await ins('ingestion_run', { source: SOURCE_COMPUTED, runtime: 'manual', status: 'running', started_at: now })
  const runId = runRow.run_id
  let written = 0
  try {
    const edges = await sel(`relations?from_type=eq.entity&to_type=eq.event&relation_type=in.(attended,speaker_at,host_of)&select=from_id,to_id,relation_type,role_context`)
    for (const e of edges) {
      if (await emit('shared_event_attendance', e.from_id, e.to_id, 1, {}, runId, now)) written++
      if (e.relation_type === 'speaker_at' || e.relation_type === 'host_of') {
        const roleType = e.relation_type === 'host_of' ? 'host' : 'speaker'
        const payload = { is_named_role: true, role_type: roleType, roles: (e.role_context ?? '').split(',').filter(Boolean) }
        if (await emit('speaker_host_status', e.from_id, e.to_id, 3, payload, runId, now)) written++
      }
    }
    await patch('ingestion_run', `run_id=eq.${runId}`, { status: 'success', finished_at: new Date().toISOString(), records_seen: edges.length, records_written: written })
    return { runId, written, edges: edges.length }
  } catch (err) {
    await patch('ingestion_run', `run_id=eq.${runId}`, { status: 'failed', finished_at: new Date().toISOString(), error_detail: String(err) })
    throw err
  }
}
