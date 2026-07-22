# Signal Pipeline — `signal` schema reference

**Project:** `Signal_Pipeline_Analytical_Spine` (Supabase ref `abkvgihlbwfloentugtd`).
**Owner:** gtm-os Signal Pipeline (Project A) — sole writer. **Authority:** `Phase_1/architecture.md` (V2).
**Status:** scaffolded 2026-06-28 (YED-45). 11 tables, RLS-enabled, 0 rows.

All base tables live in the `signal` schema (kept off the default `public` REST surface because
entities carry PII — `email_lower`, `linkedin_url_normalized`). When the Hub consumes spine data,
expose a read-only `signal_read` schema of views; never the base tables (architecture §6).

**Access:** REST/SDK with the project `sb_secret_…` key — no MCP (retired to avoid cross-account
token bleed). `signal` is exposed to PostgREST for `service_role` only; `anon`/`authenticated`
have zero grants. See `MCP_SETUP.md` §4 for the exposure snippet and the `Accept-Profile: signal`
header convention.

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
- Source contracts: `events_pipeline` **SHIPPED** (YED-108, Signals 1 & 2 live). ~~`rss_luma`~~ **dropped 2026-07-17** (Signal 3 gone). Next modeling work = the **topic-intelligence layer** (elevated Signal 5) — no new source; computes over the graph. See below + `Phase_1/topic_intelligence_spec.md`.

## Planned — topic-intelligence modeling layer (pre-migration, 2026-07-17)

Not yet applied. New `signal` objects specced in `Phase_1/topic_intelligence_spec.md` (architecture §0.6 V2.2):

| Object | Kind | Grain / purpose |
|---|---|---|
| `topic_cluster` | dimension | one canonical theme (the `theme → topic` rollup); `topics.cluster_id` FKs it |
| `topics.{cluster_id, cluster_assignment_confidence, cluster_assigned_by}` | column adds | non-destructive theme membership (nullable FK; single-membership V1) |
| `topic_trend` | computed substrate | one (subject, window, `as_of_date`) snapshot — theme trajectory (append-only history) |
| `topic_pair_metric` | computed substrate | one canonical-ordered pair per window — co-occurrence + shared-speaker bridges |

The `signals` fact table needs **no structural change** (it already carries `topic_id`/`related_topic_id`/`payload`); the `topic_intersection` type is kept (enum drops `talent_density_event` + `same_day_cross_event_pairing`, 0 rows). Computed tables skip per-row `provenance` (lineage via `ingestion_run_id` + `content_hash` + `as_of_date`).
