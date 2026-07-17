// Entry point — events_pipeline ingestion + signal derivation (YED-108, runtime='manual').
//   bun run scripts/ingest-events.ts --notion        # live, unattended (reads the Notion API)
//   bun run scripts/ingest-events.ts <fixture.json>  # MCP-dumped EventsDump (out of git; PII)
// Env: SUPABASE_SPINE_URL, SUPABASE_SPINE_SERVICE_KEY, and (for --notion) NOTION_GTM_OS_SIGNAL_INGESTION_TOKEN.
import { FixtureReader, NotionApiReader } from '../lib/reader'
import { runIngest } from '../lib/ingest'
import { deriveSignals } from '../lib/derive'

const arg = process.argv[2]
if (!arg) { console.error('usage: bun run scripts/ingest-events.ts (--notion | <fixture.json>)'); process.exit(1) }
const reader = arg === '--notion' ? new NotionApiReader() : new FixtureReader(arg)

const dump = await reader.read()
console.log(`read: ${dump.events.length} events, ${dump.people.length} people, ${dump.companies.length} companies, ${dump.topics.length} topics`)
const ing = await runIngest(dump)
console.log(`ingest  run ${ing.runId} — seen ${ing.seen} events, wrote ${ing.written} rows`)
const der = await deriveSignals()
console.log(`derive  run ${der.runId} — ${der.edges} person→event edges, wrote ${der.written} signals`)
