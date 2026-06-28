# Signal Pipeline — `signal` schema reference

**Project:** `Signal_Pipeline_Analytical_Spine` (Supabase ref `abkvgihlbwfloentugtd`).
**Owner:** gtm-os Signal Pipeline (Project A) — sole writer. **Authority:** `Phase_1/architecture.md` (V2).
**Status:** scaffolded 2026-06-28 (YED-45). 11 tables, RLS-enabled, 0 rows.

All base tables live in the `signal` schema (kept off the default `public` REST surface because
entities carry PII — `email_lower`, `linkedin_url_normalized`). When the Hub consumes spine data,
expose a read-only `signal_read` schema of views; never the base tables (architecture §6).

## Conventions (every ingested table)
- **PK** surrogate `*_id uuid default gen_random_uuid()` (UUID v4 — `pg_uuidv7` unavailable on the instance; time-order via the `created_at` index).
- **Provenance contract** (hygiene §2), NOT NULL: `source`, `fetched_at`, `last_verified_at`, `last_modified_at`, `ingestion_run_id`.
- **Idempotency**: `source_record_id` when a stable source ID exists, else `content_hash`; enforced by `CHECK (source_record_id IS NOT NULL OR content_hash IS NOT NULL)`.
- `last_modified_at` / `updated_at` auto-maintained by `moddatetime` triggers.
- **RLS** enabled on all tables with **no policy** = deny-all to `anon`/`authenticated`; the service-role bypasses RLS. The `signal` schema also has no `anon`/`authenticated` USAGE grant.

## Tables

| Table | Kimball role | Grain | Primary consumer |
|---|---|---|---|
| `ingestion_run` | run control | one job execution | every write FKs `ingestion_run_id`; blast-radius / audit |
| `source_state` | watermark control | one row per source | incremental ingestion cursor (D5) |
| `entities` | dimension | one canonical person **or** company | resolver, scoring, signals |
| `entity_external_ids` | xref | one (source, external_id) mapping | cross-system join Notion/HubSpot/Apollo ↔ spine |
| `events` | dimension | one event | Signals 1,2,3,4,6 |
| `topics` | dimension | one canonical topic (+ synonym set) | Signals 4,5 |
| `signals` | **fact** | one detected signal = (type, subject, context) | Phase 2 activation / HITL |
| `relations` | factless-fact / bridge | one typed edge (entity/event/topic) | graph traversal, computed signals |
| `provenance` | lineage | one source observation → one target row | freshness, merge priority, replay |
| `conflict_log` | append-only audit | one field-level conflict | dedup review queue (HITL) |
| `suppression` | gate | one suppression entry per entity | **hard gate read before any Phase 2 score** |

### Dedup enforcement (DB-level, on `entities`)
Partial unique indexes make the Phase-0 duplicate cases structurally impossible:
- `UNIQUE(email_lower) WHERE email_lower IS NOT NULL`
- `UNIQUE(linkedin_url_normalized) WHERE linkedin_url_normalized IS NOT NULL`
- `UNIQUE(company_domain) WHERE entity_type='company' AND company_domain IS NOT NULL` — kills the Betaworks / Zo / LangChain / Microsoft double-writes.
- `GIN(normalized_name gin_trgm_ops)` — fuzzy fallback that *gates human review* (≥0.92 → `conflict_log`, never auto-merge), per the email-less fallback ladder (architecture §2.1).

## Deviations from `Phase_1/architecture.md` V2 (deliberate, validated)
1. **Schema stays `signal`; no `signal_read` views yet.** Dedicated project (not the shared `GTM_OS_HUB`), so `signal_read` is deferred until the Hub actually reads the spine.
2. **`suppression` active index is a plain composite** `(entity_id, expires_at)`, not the spec's `WHERE expires_at IS NULL OR expires_at > now()` — Postgres rejects non-IMMUTABLE `now()` in an index predicate. Active filtering happens at query time.
3. **Migrations live in `supabase/migrations/`** (canonical Supabase CLI / GitHub-integration path), not `apps/db/migrations/` as YED-45 originally named.

## Not yet done (follow-ups)
- Seed Day-1 `suppression` rows (current employer, active pipeline) — requires `entities` to exist first (post-ingestion).
- `signal_read` views + PostgREST exposure — when the Hub consumes the spine.
- `signal.eval_runs` table — when eval coupling lands (architecture §7; coordinate direction with `eval-harness`, JC-6).
- First source contracts in order: `events_pipeline` → `rss_luma` → `rss_news` (architecture §3.12).
