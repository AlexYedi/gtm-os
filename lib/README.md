# `lib/` — Signal Pipeline ingestion (YED-108)

The first source contract of the Signal Pipeline: ingest the Notion **events pipeline** into the
Supabase `signal` spine and derive the P0 workhorse signals. Runtime is **script-first**
(`ingestion_run.runtime='manual'`); n8n / `pg_cron` orchestration is a later step. Full scope:
`Phase_1/ingestion_mvp.md`. Schema: `supabase/schema.md`. Architecture: `Phase_1/architecture.md`.

## Modules
| File | Role |
|---|---|
| `spine.ts` | PostgREST client for the `signal` schema (service-role key, `Accept/Content-Profile: signal`). |
| `normalize.ts` | Dedup-key + slug normalizers (name, linkedin, domain, slug, sha256; funding + role maps). |
| `reader.ts` | `EventsReader` interface + `FixtureReader` (MCP-dump, proven) + `NotionApiReader` (token path, TODO). |
| `resolve.ts` | Shared entity resolver: idempotency via `entity_external_ids`, then the email-less natural-key ladder. |
| `ingest.ts` | `events_pipeline` source contract — dimensions + relations, run control, watermark. Idempotent. |
| `derive.ts` | Signals 1 (`shared_event_attendance`) & 2 (`speaker_host_status`) from the relation graph. |

## Run
```bash
bun run ingest <fixture.json>      # env: SUPABASE_SPINE_URL, SUPABASE_SPINE_SERVICE_KEY
```
`<fixture.json>` is an MCP-dumped `EventsDump` (kept **out of git** — carries entity PII). Re-runs are
idempotent (0 writes). The unattended `NOTION_TOKEN` path (`NotionApiReader`) is the next step — it
needs a Notion internal integration and live-API verification before wiring (see `reader.ts`).

## Proven
2026-07-15, first run (3 events): 12 entities · 3 events · 13 topics · 26 relations · 28 provenance ·
14 signals. Idempotent re-run = 0 writes. anon key on `signal.*` → 401 (PII guardrail intact).
