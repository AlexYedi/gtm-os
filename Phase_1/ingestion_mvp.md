# Phase 1 — First Ingestion Scope: Prove the Spine

**Status:** Scoped, ready to build · **Date:** 2026-07-15 · **Owner:** Alex
**Decisions locked (2026-07-15):** (1) first build = **prove the spine** with the existing Notion events-pipeline data → Signals 1 & 2 (Capstone 1), NOT YED-56's external sources (that's Capstone 2). (2) Runtime = **script-first** (`ingestion_run.runtime='manual'`), orchestrate with n8n/pg_cron later once the logic is proven — this is the architect's documented fallback and honors "architecture before automation."
**Authoritative inputs:** `Phase_1/architecture.md` §2.1 / §3 / §5 (resolver, contracts, data flow) · `supabase/schema.md` (table contracts) · `Phase_0/signal_seed_list.md` (Signals 1–3 are the P0 workhorses).

---

## Goal (one sentence)

Land real, deduplicated rows in the `signal` spine from the Notion Events DB — exercising the full resolver → write-order → idempotency → provenance machinery end-to-end — and derive Signal 1 (and Signal 2 if the role source is confirmed) so the spine is *proven*, not just scaffolded.

**Definition of done:** running the script twice yields identical row counts (idempotent), every written row carries provenance + an `ingestion_run_id`, and at least one `signal.signals` row of type `shared_event_attendance` is queryable over REST.

---

## First source contract — `events_pipeline` (Notion)

Confirmed live schema. Events DB data source: `collection://9dcbc999-b4ed-4a51-b48a-10aaf171f1ba` (parent DB `96ac459885bb40298aef42e878df17ae`). Related data sources:
- People → `collection://4a1af67f-9141-4ba5-aa9d-88b07dcd5f86`
- Companies → `collection://d5910dc3-8327-4b49-9294-fc9499709a98`
- Topics → `collection://d61ce9df-94b3-4637-aa09-d77e09ab3a74`

### Field mapping (Notion Events → `signal.events`)
| Notion property | Type | → spine column | Notes |
|---|---|---|---|
| page `url` / id | — | `source_record_id` + `entity_external_ids.external_id` | Notion page id is the stable idempotency key |
| `Event Name` | title | `events.title` | |
| `Event Date` (`date:Event Date:start`) | date | `events.event_date` | date-only; use `start`, drop time |
| `Location` | text | `events.venue` | |
| `Event Status` | select | `events.event_status` | **enum matches the CHECK 1:1** — `intake·researched·content_drafted·attended·post_complete·not_attending`. No translation needed. |
| `Event Name`+date+venue | — | `events.event_slug` (UNIQUE) | `slugify(date + '-' + venue + '-' + title)` |
| `People` (relation) | relation | → `entities` (person) + `relations` | attendees/roster |
| `Companies` (relation) | relation | → `entities` (company) + `relations` | |
| `Topics` (relation) | relation | → `topics` + `relations` | `canonical_slug = slugify(topic name)` |

`source = 'events_pipeline'` on every row. Watermark = Notion `last_edited_time` (max seen → `source_state.last_watermark`).

### Open items to confirm at build (don't guess — inspect)
1. **People / Companies / Topics property names** — fetch each related data source's schema for the fields that populate `entities.email_lower`, `linkedin_url_normalized`, `company_domain`, `normalized_name`, `current_title`. (Only the Events schema is confirmed above.)
2. **Signal 2 role source** — where "speaker/host at this event" lives. Candidates: a `Role Context`/role field on the People DB (per seed list §), or inferred from the event's `Content Type` (`linkedin_dm_speaker` / `linkedin_dm_host` drafts). Confirm before wiring Signal 2; if unclear, ship Slice 2 with Signal 1 only and defer Signal 2.
3. **Notion access from a standalone script** — the script runs outside a Claude session, so it needs the **Notion HTTP API + an integration token** (`NOTION_TOKEN`), not the MCP. Confirm an integration exists with read access to the Content Hub (or create one). *De-risk option:* do the very first run MCP-assisted inside a Claude session (read Notion via MCP → write spine via REST) to get first rows, then codify the identical logic into the script.

---

## Proposed `lib/` layout (none prescribed by the architecture — this is the proposal)

```
lib/
  spine/
    client.ts        REST wrapper: SUPABASE_SPINE_URL + SUPABASE_SPINE_SERVICE_KEY,
                     sets Accept-Profile: signal (reads) / Content-Profile: signal (writes).
                     get(), insert(), upsert(onConflict) helpers.
    types.ts         Hand-written TS types for the 11 signal tables (from supabase/schema.md).
  normalize/index.ts  email_lower, linkedin_url_normalized, company_domain, normalized_name
                     (strip Inc./LLC), eventSlug(), topicSlug(), contentHash() = sha256(normalized record).
  resolve/resolveEntity.ts  the SHARED resolver — the fallback ladder (below). Called by ingest
                     and (later) the nightly sweep. One function, both layers.
  ingest/
    events-pipeline.ts  the source contract: read Notion → resolve entities → write in order.
    run.ts              runner: open ingestion_run → drive contract → update source_state → close run.
  notion/events.ts     Notion read adapter (query the Events data source + expand People/Companies/Topics).
scripts/ingest-events.ts   entry point → `bun run scripts/ingest-events.ts` (runtime='manual').
```

**Access decision (recommended):** raw `fetch` against the PostgREST data API — zero new deps, full control of the `Accept-Profile`/`Content-Profile: signal` headers, matches the "REST data API" framing. (`@supabase/supabase-js` with `.schema('signal')` is the ergonomic alternative if we'd rather have the SDK — decide at build; raw fetch keeps `deps: []`.)

---

## Resolver — the email-less fallback ladder (architecture §2.1)

`resolveEntity(candidate) → { entity_id, action: 'matched'|'created'|'flagged' }`. Read-before-write; the partial unique indexes are the DB-level backstop.

**Person:** (1) `email_lower` exact → match · (2) `linkedin_url_normalized` exact → match · (3) `normalized_name` + `company_domain` both match → match · (4) `normalized_name` alone, trigram sim ≥ 0.92 → **flag in `conflict_log`, never auto-merge** · (5) else create.
**Company:** (1) `company_domain` exact → match · (2) `normalized_name` (Inc./LLC stripped) → match if neither side has a domain, flag if domains differ · (3) else create.
**Person-vs-Company guard:** before creating a Company, if the domain matches a personal-brand pattern or the identity already resolves to a Person, do not create the Company (the Matt Turck case).

---

## Idempotency + write order

- **Ingest tables** (`events`, `topics`, `entities`, …): unique `(source, source_record_id)`; `content_hash` (sha256 of normalized record) when no stable id. All writes are **upsert / `ON CONFLICT DO UPDATE`** → re-runs are no-ops. `CHECK (source_record_id IS NOT NULL OR content_hash IS NOT NULL)`.
- **`signals` fact:** its own `idempotency_key = sha256(signal_type ‖ subject ‖ event ‖ grain)` UNIQUE — do not conflate with the ingest key.
- **Per-record write sequence** (architecture §4/§5):
  1. Open `ingestion_run` (runtime='manual', status='running') — everything FKs `run_id`.
  2. Per event → resolve/upsert `entities` (people + companies) → `entity_external_ids` (Notion page ids) → `provenance` (+ `conflict_log` on flags) → upsert `events` → upsert `topics` → insert `relations` (event↔entity, event↔topic).
  3. Derive signals (app code, not pg_cron yet): **Signal 1** `shared_event_attendance` = one per (person in event roster, event); **Signal 2** `speaker_host_status` = subset flagged as speaker/host (pending open-item #2).
  4. Update `source_state` watermark (max Notion `last_edited_time`).
  5. Close `ingestion_run` (status, `records_seen/written`, `watermark_after`).

---

## Slices (ship in order)

- **Slice 1 — dimensions prove the spine (no signals).** ingestion_run + Notion Events read + `events`/`entities`/`entity_external_ids`/`topics`/`relations`/`provenance` + `source_state`. Idempotent, provenance on every row. *This alone proves the resolver + write-order + idempotency machinery.*
- **Slice 2 — first signals.** Derive Signal 1 (`shared_event_attendance`) into `signals`; add Signal 2 (`speaker_host_status`) iff open-item #2 is resolved.

**Deferred (explicitly NOT this build):** ~~`rss_luma` (Signal 3)~~ **dropped 2026-07-17**; ~~`pg_cron` for Signal 4~~ **dropped**; the **topic-intelligence modeling layer** (elevated Signal 5 → `Phase_1/topic_intelligence_spec.md`); n8n orchestration; the nightly dedup sweep (Layer B); HITL writeback to Notion; `suppression` gate; read views. All are post-proof. **Update:** this ingestion shipped as YED-108 (Signals 1 & 2 live); topic intelligence is the next modeling build.

---

## Verification (end-to-end)

1. `bun run scripts/ingest-events.ts` → prints ingestion_run summary (seen/written, watermark).
2. REST read-back (`Accept-Profile: signal`): `events`, `entities`, `relations`, `provenance` non-zero; every row has `ingestion_run_id` + provenance cols.
3. **Idempotency:** re-run → `records_written` for existing rows = 0 (upserts no-op); total counts unchanged.
4. Spot-check one event: its People/Companies/Topics resolved to the right `entity_id`/`topic_id` with no duplicates; provenance rows point back to the Notion page ids.
5. Slice 2: at least one `signals` row of type `shared_event_attendance` with a valid `idempotency_key`, `subject_entity_id`, `event_id`.
6. Negative check: anon/publishable key on `signal.*` → denied (PII guardrail intact).
7. Build snippet for LinkedIn (Track C): "proving a signal spine — resolver + idempotency on N events."

---

## Housekeeping (done alongside this scope)

- Linear: new issue created under roadmap **M2** for this Capstone-1 first ingestion (the work has had no dedicated issue).
- `docs/THE_PLAN.md`: corrected the line that mis-labeled **YED-56** as the Capstone-1 "prove the spine" step — YED-56 is the Capstone-2 external-source ingestion (M4).
