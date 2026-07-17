// PostgREST client for the `signal` schema. Service-role key, server-side only.
// Access model: REST/SDK with the project sb_secret_ key, no MCP (see supabase/schema.md,
// Phase_1/architecture.md §0.5). Non-public schema targeted via Accept-Profile/Content-Profile.

const BASE = process.env.SUPABASE_SPINE_URL
const KEY = process.env.SUPABASE_SPINE_SERVICE_KEY
if (!BASE || !KEY) throw new Error('SUPABASE_SPINE_URL / SUPABASE_SPINE_SERVICE_KEY required in env')
const REST = `${BASE}/rest/v1`
const auth = () => ({ apikey: KEY!, Authorization: `Bearer ${KEY!}`, 'Content-Type': 'application/json' })

// Resilient fetch: per-attempt 30s timeout + retry on transient network/timeout errors.
// Writes are idempotent (read-before-write / unique keys), so a retried POST is safe.
async function fetchRetry(url: string, init: RequestInit, attempts = 4): Promise<Response> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(30000) })
    } catch (e) {
      lastErr = e
      await new Promise(r => setTimeout(r, 300 * (i + 1)))
    }
  }
  throw lastErr
}

export const SOURCE_EVENTS = 'events_pipeline'
export const SOURCE_COMPUTED = 'computed'

export async function sel(pathq: string): Promise<any[]> {
  const r = await fetchRetry(`${REST}/${pathq}`, { headers: { ...auth(), 'Accept-Profile': 'signal' } })
  if (!r.ok) throw new Error(`GET ${pathq} -> ${r.status} ${await r.text()}`)
  return r.json() as Promise<any[]>
}

export async function ins(table: string, row: unknown): Promise<any> {
  const r = await fetchRetry(`${REST}/${table}`, {
    method: 'POST',
    headers: { ...auth(), 'Content-Profile': 'signal', Prefer: 'return=representation' },
    body: JSON.stringify(row),
  })
  if (!r.ok) throw new Error(`POST ${table} -> ${r.status} ${await r.text()}`)
  return (await r.json())[0]
}

export async function patch(table: string, q: string, row: unknown): Promise<void> {
  const r = await fetchRetry(`${REST}/${table}?${q}`, {
    method: 'PATCH',
    headers: { ...auth(), 'Content-Profile': 'signal', Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  })
  if (!r.ok) throw new Error(`PATCH ${table} -> ${r.status} ${await r.text()}`)
}
