# Phase 1 Architecture — gtm-os Signal Pipeline (V2)

**Status:** Proposed V2 — signed-off gate for Phase 1 build. **No "TBD" below.**
**Supersedes:** V1 (LOCKED 2026-05-20), preserved at `Phase_1/architecture_v1_superseded_2026-05-20.md`.
**Linear:** YED-44 (this doc) → unblocks YED-45 (table scaffold).
**Author:** `cto-principal-architect` pass, 2026-06-27. **Reviewer:** Alex (sign-off required before any Phase 1 migration ships).

> This is a hard gate. You can't refactor a foundation mid-build cleanly. Once Alex signs off, V2 locks; changes need an explicit re-open flag in a Linear issue.

---

## 0.5 — V2.1 amendment (2026-06-28): dedicated project (scaffolded)

V2 was written for **cohabitation** inside `GTM_OS_HUB` (forced by the 2-project free-tier cap). After review, Alex moved Empire State to a **separate Supabase account**, freeing a slot. The spine now has its **own dedicated project** — the (empty) `Empire_State_Hub` project was renamed **`Signal_Pipeline_Analytical_Spine`** (ref `abkvgihlbwfloentugtd`). This is the cleaner design analyzed in the YED-44 thread; it restores Project-A-vs-Hub separation and dissolves the shared-instance costs.

**What this changes vs V2 as written:**
- **D0 (schema isolation):** still a dedicated **`signal`** schema, but now to keep PII base tables off the dedicated project's *own* default `public` REST surface — not to avoid `learning.*` / Hub `public.*` neighbors (there are none here). The `signal_read` view layer is **deferred** until the Hub actually consumes the spine (cross-project network read = the literal "APIs only" path).
- **§6 (Hub coupling):** no longer a shared-Postgres coupling to bless. Hub → spine becomes a real cross-project read over Supabase's API; the view-contract becomes a genuine API boundary, not a compromise. JC-4 resolved in the clean direction.
- **R-1 (shared blast radius onto live `learning.*`):** **dissolved** — `learning.*` lives in a different project. MT-4 (independent scale/deploy) also dissolved.
- **Migrations** live at canonical **`supabase/migrations/`** (GitHub-integration path), not `apps/db/migrations/`.
- **`suppression` active index:** plain composite `(entity_id, expires_at)` — the spec's `now()`-predicated partial index is invalid Postgres (non-IMMUTABLE function in an index predicate).

**Scaffold status:** all 11 tables applied to `abkvgihlbwfloentugtd` (migrations `signal_01`–`signal_05`, 2026-06-28), RLS-enabled, 0 rows. Security advisors clean for `signal.*` (only the intended `rls_enabled_no_policy` INFO). Table reference: `supabase/schema.md`. Closes YED-45.

**Still open (carried):** JC-1 (11-table scope — adopted), JC-5 (runtime — deferred to YED-56), JC-6 (eval-harness direction).

**Orphan cleanup DONE (2026-07-01):** the spine project is now fully isolated to GTM — the data API reports **0 tables in `public`**, and the leftover Empire State `iteration-assets` storage bucket was **emptied + deleted** (verified: remaining buckets `[]`). No Empire State artifacts remain in `abkvgihlbwfloentugtd`.

**Access model (2026-06-28 amendment): REST/SDK via project secret key — no MCP.** The Supabase MCP was retired for gtm-os: it needs an account-level PAT, which would bleed across the now-separate Supabase accounts (Empire State runs its own account). gtm-os reaches the spine over the REST data API with the project `sb_secret_…` key (`SUPABASE_SPINE_URL` + `SUPABASE_SPINE_SERVICE_KEY` in `.env`). `signal` is exposed to PostgREST for **`service_role` only** (one-time SQL-editor snippet in `MCP_SETUP.md` §4); `anon`/`authenticated` get zero grants, so PII base tables stay off the public surface (D0 + §6 intent intact). Reads/writes set `Accept-Profile`/`Content-Profile: signal`.

---

## 0. Why V2 supersedes a LOCKED V1 (read first)

V1 locked decisions 1–9 on 2026-05-20. Its single load-bearing assumption was **"provision a dedicated Supabase project for the Signal Pipeline"** (see V1 §W2 sequencing, system diagram with tables in bare `public`). That assumption is now **invalid**, which is the explicit flag that re-opens the lock:

- **The spine consolidated (2026-06-27).** The original standalone `gtm-os-project` was **deleted**. Supabase free tier caps at **2 active projects**, and both slots are taken: `GTM_OS_HUB` (`nnywrmetdoixdbevvsvf`) and `Empire_State_Hub`. **The Signal Pipeline cannot get its own project. It must cohabit inside `GTM_OS_HUB`.**
- **`GTM_OS_HUB` already has tenants.** Verified live via Supabase MCP 2026-06-27: `public.*` holds the **Hub's** `events` / `event_briefs` / `contacts` / `content_drafts` (all 0 rows, RLS on); `learning.*` holds **live GTM University** data (`curriculum_unit` = 117 rows, plus `learner`/`unit_progress`/`submission`, RLS on). V1's plan to create `public.events`, `public.contacts`, `public.content_drafts` would **collide head-on** with the Hub's tables.

**What changed vs V1, at a glance:**

| V1 decision | V2 disposition |
|---|---|
| 1. Entity-ID strategy (Supabase UUID + mapping table) | **PRESERVED in principle; amended in detail** — UUIDv7 → v4 (verified unavailable), identity keys moved from EAV table to typed columns (DB-enforced dedup). Cross-system xref table kept. |
| 2. Notion ↔ Supabase (one-way + narrow HITL writeback) | **PRESERVED** unchanged. |
| 3. Conflict log = Supabase table | **PRESERVED** unchanged. |
| 4. Runtime = n8n | **PRESERVED + refined** — n8n for external I/O; add `pg_cron` for in-DB computed signals (natural now we share one Postgres). De-time-boxing (2026-06-27) weakened V1's main n8n rationale; see JC-5. |
| 5. Idempotency two-layer | **PRESERVED + formalized** with a watermark table. |
| 6. Secrets tiering | **PRESERVED** (carried forward, §7). |
| 7. Eval coupling | **PRESERVED** (carried forward, §7). |
| 8. R2 dashboard = Next.js | **PRESERVED** (carried forward, §7). |
| 9. Hub = read-only spine consumer | **PRESERVED + sharpened** — V1 foresaw Hub reading the spine; it did NOT foresee the Signal Pipeline cohabiting one instance with Hub-owned `public.*` and GTM University's `learning.*`. That forces the **new D0: schema isolation**. |
| (none) | **NEW D0 — schema isolation in `GTM_OS_HUB`** (the `signal` schema). |

---

## 1. Context (the situation this design must survive)

The Signal Pipeline (Project A) is the analytical spine that turns the already-shipped events pipeline (Notion + HubSpot) into a queryable, hygiene-governed foundation, then layers signal detection on top. Phase 1 stands up the spine inside `GTM_OS_HUB`, implements Hygiene Tier 1 (`Phase_0/02_hygiene_tier_1_spec.md`), and ingests **only** the 7 seed signals (`Phase_0/signal_seed_list.md`). Nothing else (no watchlist construction, no funding/job-board ingestion, no scraping — ethics rule).

**Live environment facts verified via MCP (2026-06-27, `GTM_OS_HUB`):**
- `signal` schema does **not** exist yet — free to claim.
- Extensions available (uninstalled unless noted): `pg_cron` 1.6.4, `citext`, `pg_trgm`, `fuzzystrmatch`, `vector` 0.8.0, `moddatetime`, `pgmq`, `pg_net`. **Installed:** `pgcrypto` (→ `gen_random_uuid()`), `uuid-ossp`, `pg_stat_statements`, `supabase_vault`, `pg_graphql`.
- **No `pg_uuidv7` extension** on this instance — drives the UUID call (§3 / JC-2).

---

## 2. Locked decisions

| # | Decision | Choice | Confidence | Rejected alternatives (why) |
|---|---|---|---|---|
| **D0** | **Schema isolation** *(NEW)* | Create a dedicated **`signal`** schema in `GTM_OS_HUB`. The Signal Pipeline **owns and is the sole writer** to `signal.*`. The Hub reads only via **read-only views in a separate `signal_read` schema**; it gets `SELECT` there and **zero privileges** on `signal.*` base tables. **Keep** the empty `public.events` stub untouched — it's the Hub's; do not reuse, do not drop. | **95% — high** | (a) Write to `public.*`: collides with Hub's `public.events`/`contacts`/`content_drafts`, blurs ownership. (b) Separate project: impossible, free cap hit. (c) Reuse `learning.*`: wrong domain, entangles live GTM University (117 rows). (d) Drop `public.events`: another repo's object; irreversible cross-project act, not ours to take. |
| **D1** | **Entity-ID strategy** | Surrogate **`entity_id UUID` PK**, invariant for life (V1 principle preserved). Natural identity keys stored as **typed columns** (`email_lower`, `linkedin_url_normalized`, `company_domain`, `normalized_name`) used for match-on-ingest, with **partial unique indexes** enforcing dedup at the DB layer. Email-less contacts (72%) resolve via the fallback ladder (§2.1). Cross-system identity (Notion↔HubSpot↔Apollo↔spine) lives in **`signal.entity_external_ids`** (carried from V1). | **90% — high** | (a) Natural key as PK: breaks on email/domain change; 72% have no email. (b) Notion page ID as PK: not portable to non-Notion sources. (c) V1's EAV `entity_identity_keys` table: amended to columns for type-safety + clean unique enforcement (JC-3). (d) Name-only auto-merge: false-merge risk; kept human-gated. |
| **D2** | **Notion ↔ Supabase** | **One-way Notion → Supabase by default** (Notion = human workspace + events-pipeline write target; Supabase = analytical spine), with a **narrow HITL-gated writeback allow-list** (V1 preserved): `dm_priority_score`, `is_talent_density`, `pairing_id`, `met_in_person`, `sent`/`replied_at`. | **88% — medium-high** | (a) Exact replication: couples spine to Notion schema churn; brittle. (b) Full two-way mirror: classic dual-master conflict/loop anti-pattern. The narrow writeback is the minimum needed to feed the content skills. |
| **D3** | **Conflict-log location** | **Supabase table `signal.conflict_log`** (append-only; only resolution columns mutable). | **95% — high** | (a) Notion page: not queryable, pollutes workspace, can't join to entities. (b) Append-only repo file: no joins/query, doesn't survive a runtime swap, violates source-of-truth discipline (a repo file is GitHub's job = code state). Conflicts are analytical data that must join to entities → spine. |
| **D4** | **Runtime** | **n8n for external I/O + `pg_cron` for in-DB computation.** External ingestion (Notion poll, luma/partiful/news RSS, the nightly dedup sweep) runs in **n8n** (in-stack, MCP-wired, retries/observability). Pure relation-graph signals (4, 5, recurrence) run as **`pg_cron` SQL jobs** writing into `signal.signals`. Vercel Workflow DevKit stays OUT (locked). **Documented simplest-viable fallback:** if n8n setup friction exceeds ~90 min, drop to **scripts + GitHub Actions cron + `pg_cron`** (per V1's own fallback note). | **72% — medium** | (a) Pure n8n for everything: wasteful for SQL-only computations now that we're in one Postgres. (b) Edge functions for everything: viable, but n8n already owns the orchestration discipline. (c) Cron+scripts only: the fallback, not the default — loses n8n's retry/observability. De-time-boxing (2026-06-27) removed V1's "hour budget is binding" argument for n8n; flagged as JC-5. |
| **D5** | **Idempotency + data-plane dedup** | **Two-layer** (V1 preserved). **Layer A — insert-time:** unique `(source, source_record_id)`, with `content_hash` (SHA-256 of normalized record) as the key when no stable ID exists; all ingest is `ON CONFLICT DO UPDATE` (re-runs are no-ops). **Layer B — nightly dedup sweep** (n8n, 2am UTC) runs entity resolution across sources; new dup pairs → `conflict_log` (`resolution='pending'`). **Incremental watermark** per source in **`signal.source_state`**; every write stamped with `ingestion_run_id`. | **90% — high** | (a) Truncate-and-reload: loses provenance, not incremental. (b) Insert-time only: misses the ERA/Betaworks/Zo *within-source* dups (different Notion page IDs). (c) Nightly only: too slow — a 9am dup is live to scoring until next 2am. Both layers call one shared `resolveEntity()`. |

### 2.1 Entity resolution — the email-less fallback ladder (D1 detail)

72% of HubSpot contacts (95/132) have no email (`inventory_findings.md` §C.2). Resolution order on ingest:

**Person:** (1) `email_lower` exact → **auto-merge**; (2) else `linkedin_url_normalized` exact → **auto-merge**; (3) else `normalized_name` + `company_domain` both match → **auto-merge**; (4) else `normalized_name` alone, trigram sim ≥ 0.92 → **flag in `conflict_log`, never auto-merge**; (5) else **create**.

**Company:** (1) `company_domain` exact → **auto-merge** (fixes Betaworks / Zo / LangChain / Microsoft); (2) else `normalized_name` (after stripping `Inc.`/`LLC`/… per hygiene §1.2) → **auto-merge** if no domain on either side, **flag** if domains differ; (3) else **create**.

**Person-vs-Company guard (Matt Turck, §C.2):** before creating a Company, if the candidate domain matches a personal-brand pattern OR the identity already resolves to a Person, **do not** create the Company. Enforced pre-write in the resolver.

Tooling: `citext` exact match; `pg_trgm` + `fuzzystrmatch` for the similarity that gates human review.

### 2.2 UUID generation (D1 detail — JC-2)

Hygiene §1.4 wants **UUID v7** for time-sortability. `pg_uuidv7` is **not available** here and native `uuidv7()` needs Postgres 18. **Decision: `gen_random_uuid()` (v4)** from installed `pgcrypto`; time-ordering comes from the `created_at` index, not the key. Minor, deliberate deviation from V1/hygiene — flagged. Revisit via a `pg_tle`-vendored v7 function if time-ordered PK scans become a hot path (MT-1).

---

## 3. Schema spec for YED-45

All objects in schema **`signal`**. Every table **RLS-enabled** (instance convention). Writes via service-role key; public/anon read only through `signal_read.*` views (§6), never base tables.

**Conventions on every table:** PK = surrogate `*_id UUID DEFAULT gen_random_uuid()`; provenance contract columns NOT NULL per hygiene §2 (`source`, `fetched_at`, `last_verified_at`, `last_modified_at`, `ingestion_run_id`); `source_record_id` nullable only when no source ID, in which case `content_hash` NOT NULL (CHECK); `created_at timestamptz NOT NULL DEFAULT now()`; `last_modified_at` auto-maintained by `moddatetime`. Shared `source` value set: `events_pipeline`, `notion_manual`, `hubspot_manual`, `apollo`, `clay`, `rss_luma`, `rss_partiful`, `rss_news`, `linkedin_export`, `computed`, `other`.

**Table inventory (11).** The 6 named in YED-45 + 5 mandatory supports (flagged JC-1):

| Table | Kimball role | In YED-45's 6? |
|---|---|---|
| `signal.entities` | Dimension (person + company) | Yes |
| `signal.entity_external_ids` | Cross-system xref (V1 locked) | **Added (carried from V1)** |
| `signal.events` | Dimension (event) | Yes |
| `signal.topics` | Dimension (topic) | **Added — Signals 4 & 5** |
| `signal.signals` | Fact (one detected signal) | Yes |
| `signal.relations` | Factless-fact / bridge (graph) | Yes |
| `signal.provenance` | Per-row lineage + freshness | Yes |
| `signal.conflict_log` | Append-only audit fact | Yes |
| `signal.suppression` | Gate dimension (hygiene §5) | **Added — non-negotiable before Signal 1** |
| `signal.source_state` | Watermark control (D5) | **Added** |
| `signal.ingestion_run` | Run control / blast radius | **Added — FK target** |

---

### 3.1 `signal.entities` — person + company dimension
**Grain:** one canonical person OR company. Polymorphic via `entity_type` so `relations` FKs a single `entity_id`. SCD **Type-1** in Tier 1; history captured in `conflict_log` + `provenance`. Type-2 deferred to Hygiene Tier 2.

| Column | Type | Null | Notes |
|---|---|---|---|
| `entity_id` | uuid PK | no | `DEFAULT gen_random_uuid()` |
| `entity_type` | text | no | `CHECK IN ('person','company')` |
| `display_name` | text | no | original casing |
| `normalized_name` | citext | no | hygiene §1.2 |
| `email_lower` | citext | yes | person |
| `linkedin_url_normalized` | text | yes | person |
| `current_title` | text | yes | person |
| `company_domain` | citext | yes | company |
| `funding_stage` | text | yes | company; `CHECK` enum |
| `industry` | text | yes | company |
| `source` / `source_record_id` / `content_hash` | text | no/yes/yes | `CHECK (source_record_id IS NOT NULL OR content_hash IS NOT NULL)` |
| `fetched_at` / `last_verified_at` / `last_modified_at` | timestamptz | no | |
| `ingestion_run_id` | uuid | no | FK → `ingestion_run` |
| `created_at` | timestamptz | no | |

**Indexes (dedup enforcement):**
- `UNIQUE (email_lower) WHERE email_lower IS NOT NULL`
- `UNIQUE (linkedin_url_normalized) WHERE linkedin_url_normalized IS NOT NULL`
- `UNIQUE (company_domain) WHERE entity_type='company' AND company_domain IS NOT NULL` — **makes the Betaworks/Zo/LangChain/Microsoft double-write impossible at the DB layer.**
- `gin (normalized_name gin_trgm_ops)` — fuzzy fallback; `btree (entity_type)`.

### 3.2 `signal.entity_external_ids` — cross-system xref *(V1 locked)*
**Grain:** one (entity, source, external_id) mapping. Resolves hygiene Open Q #6 (bidirectional Notion↔HubSpot↔Apollo↔spine join). Add a HubSpot ID later = one insert, no merge.

| Column | Type | Null | Notes |
|---|---|---|---|
| `entity_id` | uuid | no | FK → `entities` |
| `source` | text | no | enum |
| `external_id` | text | no | Notion page id / HubSpot object id / Apollo id |
| `created_at` | timestamptz | no | |

**Indexes:** `UNIQUE (source, external_id)`; `btree (entity_id)`.

### 3.3 `signal.events` — event dimension
**Grain:** one event. Anchor for Signals 1, 2, 3, 4, 6.

| Column | Type | Null | Notes |
|---|---|---|---|
| `event_id` | uuid PK | no | |
| `event_slug` | text | no | date+venue+normalized title; `UNIQUE` |
| `title` | text | no | |
| `event_date` | date | no | |
| `venue` | text | yes | |
| `event_status` | text | no | `CHECK IN ('intake','researched','content_drafted','attended','post_complete','not_attending')` — `not_attending` added (Open Q #8) |
| `is_talent_density` | boolean | no | `DEFAULT false` (Signal 3) |
| `expected_dm_count` | int | yes | Signal 3 |
| `source`/`source_record_id`/`content_hash` | text | no/yes/yes | Notion page id; `CHECK` as above |
| `fetched_at`/`last_verified_at`/`last_modified_at` | timestamptz | no | |
| `ingestion_run_id` | uuid | no | FK |
| `created_at` | timestamptz | no | |

**Indexes:** `UNIQUE (source, source_record_id)`; `UNIQUE (event_slug)`; `btree (event_date)`; `btree (event_status)`.

### 3.4 `signal.topics` — topic dimension *(scope addition; Signals 4 & 5)*
**Grain:** one canonical topic. Synonym set is load-bearing (hygiene §1.3) — without it novelty signals fire on synonym noise.

| Column | Type | Null | Notes |
|---|---|---|---|
| `topic_id` | uuid PK | no | |
| `canonical_slug` | text | no | kebab-case; `UNIQUE` |
| `display_name` | text | no | |
| `synonym_set` | jsonb | no | `DEFAULT '[]'`; human-reviewed before add |
| `source`/`source_record_id`/`content_hash` | text | no/yes/yes | Notion page id; `CHECK` |
| `fetched_at`/`last_verified_at`/`last_modified_at` | timestamptz | no | |
| `ingestion_run_id` | uuid | no | FK |
| `created_at` | timestamptz | no | |

**Indexes:** `UNIQUE (canonical_slug)`; `UNIQUE (source, source_record_id)`; `gin (synonym_set jsonb_path_ops)`.

### 3.5 `signal.signals` — the fact table
**Grain:** one detected signal = `(signal_type, subject, context)`. Common dimensions promoted to columns; signal-specific derived attributes in `payload jsonb` so the 60-day re-run (`inventory_findings.md` §6.4) can evolve attributes without migration.

| Column | Type | Null | Notes |
|---|---|---|---|
| `signal_id` | uuid PK | no | |
| `signal_type` | text | no | `CHECK IN ('shared_event_attendance','speaker_host_status','talent_density_event','same_day_cross_event_pairing','topic_intersection','event_conversation_count','dm_reply')` |
| `subject_entity_id` | uuid | yes | FK → `entities` |
| `event_id` / `related_event_id` | uuid | yes | FK → `events` (related = Signal 4 pairing) |
| `topic_id` / `related_topic_id` | uuid | yes | FK → `topics` (Signals 4, 5) |
| `score` | numeric | yes | generic priority (dm_priority high=3/med=2/low=1) |
| `status` | text | no | `CHECK IN ('pending','active','actioned','suppressed','expired')` `DEFAULT 'pending'` |
| `payload` | jsonb | no | `DEFAULT '{}'` — `is_named_role`, `role_type`, `pairing_id`, `meaningful_conversation_count`, `reply_status`, … |
| `idempotency_key` | text | no | `UNIQUE` — `sha256(signal_type ‖ subject ‖ event ‖ grain)` |
| `detected_at` | timestamptz | no | |
| `source`/`source_record_id`/`content_hash` | text | no/yes/yes | `computed` for graph-derived; `CHECK` |
| `last_modified_at` | timestamptz | no | |
| `ingestion_run_id` | uuid | no | FK |
| `created_at` | timestamptz | no | |

**Indexes:** `UNIQUE (idempotency_key)`; `btree (signal_type, detected_at DESC)`; `btree (subject_entity_id)`; `btree (event_id)`; `btree (status) WHERE status='pending'`.

### 3.6 `signal.relations` — the graph (factless fact / bridge)
**Grain:** one typed edge (entity↔event, entity↔topic, event↔topic, entity↔entity). Polymorphic edge table (Notion's graph is heterogeneous); endpoint integrity enforced by resolver + a periodic referential-audit job (handles the dangling-relation bug, hygiene 2026-04-29).

| Column | Type | Null | Notes |
|---|---|---|---|
| `relation_id` | uuid PK | no | |
| `from_type` / `from_id` | text / uuid | no | `CHECK from_type IN ('entity','event','topic')` |
| `to_type` / `to_id` | text / uuid | no | same CHECK |
| `relation_type` | text | no | `CHECK IN ('attended','speaker_at','host_of','panelist_at','works_at','tagged_topic','co_event','related_topic')` |
| `role_context` | text | yes | speaker/host/panelist/attendee/sponsor/organizer/mentor (Signal 2) |
| `met_in_person` | boolean | yes | Signal 6 |
| `is_active` | boolean | no | `DEFAULT true`; soft-delete on dangling sweep |
| `valid_from` / `valid_to` | timestamptz | yes | light SCD-2 (person changes company); `valid_to` null = current |
| `source`/`source_record_id`/`content_hash` | text | no/yes/yes | `CHECK` |
| `last_modified_at` | timestamptz | no | |
| `ingestion_run_id` | uuid | no | FK |
| `created_at` | timestamptz | no | |

**Indexes:** `UNIQUE (from_type, from_id, to_type, to_id, relation_type)`; `btree (from_type, from_id)`; `btree (to_type, to_id)`; `btree (relation_type) WHERE is_active`.

### 3.7 `signal.provenance` — per-row lineage + freshness
**Grain:** one source-record observation contributing to one target row (any table type). Per hygiene §2.

| Column | Type | Null | Notes |
|---|---|---|---|
| `provenance_id` | uuid PK | no | |
| `target_type` / `target_id` | text / uuid | no | `CHECK target_type IN ('entity','event','topic','signal','relation')` |
| `source` / `source_record_id` / `content_hash` | text | no/yes/yes | `CHECK (source_record_id IS NOT NULL OR content_hash IS NOT NULL)` |
| `source_priority` | int | no | merge priority (notion_manual=1 … other=99, hygiene §4.1) |
| `raw_payload` | jsonb | yes | raw record for replay/debug |
| `fetched_at` / `last_verified_at` | timestamptz | no | |
| `ingestion_run_id` | uuid | no | FK |
| `created_at` | timestamptz | no | |

**Indexes:** `UNIQUE (target_type, target_id, source, source_record_id)`; `btree (source, source_record_id)`; `btree (target_type, target_id)`.

### 3.8 `signal.conflict_log` — append-only audit (D3)
**Grain:** one field-level conflict between two sources for one target field. Only resolution columns mutable.

| Column | Type | Null | Notes |
|---|---|---|---|
| `conflict_id` | uuid PK | no | |
| `target_type` / `target_id` | text / uuid | no | `CHECK target_type IN ('entity','event','topic','relation')` |
| `field_name` | text | no | |
| `winning_source` / `winning_value` / `winning_priority` | text / jsonb / int | no | |
| `losing_source` / `losing_value` / `losing_priority` | text / jsonb / int | no | |
| `resolution` | text | no | `CHECK IN ('auto_priority','human_pending','human_resolved')` `DEFAULT 'auto_priority'` |
| `resolved_at` / `resolved_by` | timestamptz / text | yes | `alex`/`system` |
| `detected_at` | timestamptz | no | |
| `ingestion_run_id` | uuid | no | FK |
| `created_at` | timestamptz | no | |

**Indexes:** `btree (target_type, target_id)`; `btree (resolution) WHERE resolution='human_pending'` (review queue).

### 3.9 `signal.suppression` — gate dimension *(hygiene §5; non-negotiable before Signal 1)*
**Grain:** one suppression entry per entity. Phase 2 scoring reads this as a Boolean gate **before** any score is computed.

| Column | Type | Null | Notes |
|---|---|---|---|
| `suppression_id` | uuid PK | no | |
| `entity_id` | uuid | no | FK → `entities` |
| `entity_type` | text | no | `CHECK IN ('person','company')` |
| `reason` | text | no | `CHECK IN ('current_employer','active_pipeline','personal_contact','opt_out','cold','competitor','in_flight_activation','other')` |
| `reason_detail` | text | yes | |
| `added_at` | timestamptz | no | `DEFAULT now()` |
| `expires_at` | timestamptz | yes | null = permanent; auto-lift past date |
| `added_by` | text | no | `alex`/`system` |
| `created_at` | timestamptz | no | |

**Index:** `btree (entity_id) WHERE expires_at IS NULL OR expires_at > now()`.

### 3.10 `signal.source_state` — watermark control *(D5)*
**Grain:** one row per source (incremental high-water cursor).

| Column | Type | Null | Notes |
|---|---|---|---|
| `source` | text PK | no | enum |
| `last_watermark` | text | yes | opaque (Notion `last_edited_time`, RSS pubDate) |
| `last_run_id` | uuid | yes | FK → `ingestion_run` |
| `last_success_at` | timestamptz | yes | |
| `updated_at` | timestamptz | no | `moddatetime` |

### 3.11 `signal.ingestion_run` — run control / blast radius
**Grain:** one job execution; FK target for every `ingestion_run_id`.

| Column | Type | Null | Notes |
|---|---|---|---|
| `run_id` | uuid PK | no | |
| `source` | text | no | enum |
| `runtime` | text | no | `CHECK IN ('n8n','pg_cron','github_actions','manual','edge_function')` |
| `started_at` / `finished_at` | timestamptz | no/yes | |
| `status` | text | no | `CHECK IN ('running','success','failed','partial')` |
| `records_seen` / `records_written` | int | yes | |
| `watermark_before` / `watermark_after` | text | yes | |
| `error_detail` | text | yes | |
| `created_at` | timestamptz | no | |

### 3.12 First three source contracts (hygiene §3.3)
Write contracts in this order (never ahead of ingestion):
1. **`events_pipeline`** → `events` + `entities` + `topics` + `relations` + `entity_external_ids`. Source = Notion DBs. Watermark = Notion `last_edited_time`.
2. **`rss_luma`** → `events` (Signal 3 talent-density). Watermark = item GUID/pubDate; `content_hash` fallback (RSS GUIDs sometimes unstable).
3. **`rss_news`** → background context for Signals 4–5. Same pattern.
Signals 4, 5, recurrence are **`pg_cron` SQL jobs** over `relations` + `topics`, writing `signals` (`source='computed'`).

---

## 4. Migration order for YED-45 (mechanical)
1. `CREATE SCHEMA signal; CREATE SCHEMA signal_read;`
2. `CREATE EXTENSION IF NOT EXISTS citext, pg_trgm, fuzzystrmatch, moddatetime;` (pgcrypto already installed).
3. `ingestion_run` → `source_state`.
4. Dimensions: `entities`, `entity_external_ids`, `events`, `topics`.
5. Fact + bridge: `signals`, `relations`.
6. Lineage/audit/gate: `provenance`, `conflict_log`, `suppression`.
7. Indexes + partial unique indexes (§3.x).
8. `moddatetime` triggers on `last_modified_at` / `updated_at`.
9. Enable RLS on all `signal.*`; service-role write policy + deny-anon.
10. **Seed `signal.suppression` Day-1 entries (current employer, active pipeline) BEFORE any ingestion** (hygiene §5.2).

Apply via Supabase MCP `apply_migration` (one migration per group). **Test on a Supabase branch first** if branching is available (see R-1); otherwise apply to `GTM_OS_HUB` with a reviewed migration and a `learning.*` backup taken first.

---

## 5. Data flow (10,000 ft)
```
Notion DBs ─┐
luma/partiful RSS ─┤  one-way (D2)   ── HITL writeback allow-list ──► Notion (narrow)
news RSS ─┘                                   ▲
   │  n8n poll/ingest (D4) — incremental via source_state watermark (D5)
   ▼
 RAW upsert → idempotency key (source, source_record_id)|content_hash (D5)
   │
   ▼
 RESOLVER (shared resolveEntity) → entity_id + fallback ladder (§2.1) + merge (hygiene §4)
   │   ├── conflicts → signal.conflict_log (D3)
   │   ├── cross-system ids → signal.entity_external_ids
   │   └── lineage/freshness → signal.provenance
   ▼
 signal.{entities, events, topics, relations}  ◄── pg_cron SQL: Signals 4,5,recurrence → signal.signals
   │
   ▼  suppression gate (hygiene §5)
 signal.signals (fact) ──► [Phase 2 activation / HITL]
   │
   ▼  read-only views only (D0 + §6)
 signal_read.v_*  ──► Hub (gtm-os-hub repo, separate session) · R2 dashboard (apps/dashboard)
```

---

## 6. Boundaries & coupling (Hub ↔ Signal Pipeline)

**The shared-instance coupling is blessed deliberately, with a precise, enforceable boundary.**

The Hub's invariant ("reads gtm-os over external APIs only, no shared code") was written assuming network isolation. Reality forces both into one Postgres instance. We re-express the invariant as a **published data contract at a view boundary** — the database-native equivalent of an API:

- **Ownership.** Signal Pipeline owns + sole-writes `signal.*`. Hub owns `public.*` (its 4 stubs). GTM University owns `learning.*`. **No cross-writes, ever.**
- **Contract surface.** Hub reads Signal Pipeline data **only** through curated, versioned views in `signal_read.*` (e.g. `signal_read.v_events`, `v_entities_public`, `v_signals_summary`). Base `signal.*` tables are never exposed. **No PII** (`email_lower`, `linkedin_url_normalized`) in any `signal_read` view — the most likely Phase 1 leak; audit on first build.
- **Privilege boundary (enforced, not documented-only).** Hub's Postgres role: `GRANT SELECT ON ALL TABLES IN SCHEMA signal_read` and **zero** privileges on `signal.*`. RLS on base tables denies anon.
- **No code sharing.** No shared migrations, ORM models, or types package. The Hub generates its own types from `signal_read` views. The view definitions are the only shared artifact — a contract, not code.
- **`public.events` stub.** The Hub's, empty. Signal Pipeline does not write/reuse/drop it. If the Hub wants signal event data, it reads `signal_read.v_events` and renders or backfills its own `public.events` — the Hub's decision, in the Hub's session.

**Why view-contract over a true HTTP API:** a REST/Edge API would be cleaner isolation but adds an always-on surface, auth plumbing, and latency for zero benefit at one-user scale. The view contract gives ~90% of the isolation (read-only, curated, no base-table access) for ~0 extra infra. Split path is MT-4.

---

## 7. Decisions carried forward from V1 (unchanged — still valid)

These V1 decisions are unaffected by the spine consolidation; preserved verbatim in intent (full text in the superseded V1 doc):

- **Secrets tiering (V1 §6).** `.env` (local, gitignored) · Vercel env (dashboard) · n8n credentials store (runtime) · Supabase Vault (service-role keys n8n writes with). Service-role never reaches the browser; dashboard uses anon key + RLS. `.env.example` ships with placeholders.
- **Eval coupling (V1 §7).** Eval results → `signal.eval_runs` (structured, dashboardable) **and** mirrored to `evals/<date>_<skill>.md` (portfolio asset). GitHub Action gates PRs touching listed skills. Rubric/golden-set authored once in the `eval-harness` sibling project (coordinate direction — JC-6).
- **R2 dashboard (V1 §8).** Custom Next.js page in `apps/dashboard`, Vercel hobby, Server Components read Supabase via service-role server-side, charts via `recharts`. This dashboard IS a D3 capstone artifact. Must exist before any sixth content skill (Clay red-flag #4).

(Note: `signal.eval_runs` lives in the `signal` schema under D0, not bare `public` as V1 drew it.)

---

## 8. Open risks / migration triggers

| ID | Risk / trigger | Mitigation / action |
|---|---|---|
| R-1 | **Shared-instance blast radius** — a bad `signal.*` migration could hit `public.*` (Hub) or `learning.*` (live, 117 rows). | Schema isolation limits scope; every migration reviewed; test on a Supabase **branch** if available; never `DROP` outside `signal.*`; back up `learning.*` before first migration. |
| R-2 | **Free-tier limits** (500MB storage, 2GB egress; branch availability). | Current usage tiny; signal volume ~5–20 rows/wk. Monitor via `get_advisors`. If dashboard egress > 1.5GB/mo by W10, Supabase Pro ($25/mo) is the cleanest first dollar (inside budget). |
| MT-1 | `pg_uuidv7` becomes available OR time-ordered PK scans go hot. | Switch `*_id` default to a v7 fn; existing v4 rows stay valid. |
| MT-2 | Seed-signal set changes at the 60-day re-run (≥ 2026-06-29). | `signals.payload` JSONB absorbs new attributes; a new `signal_type` is a one-line CHECK change. |
| MT-3 | Content skills need *more* derived attributes back in Notion than the D2 allow-list. | Extend the narrow writeback allow-list deliberately, HITL-gated; do not drift to full two-way sync. |
| MT-4 | Hub + Signal Pipeline need independent scale/deploy the shared instance blocks. | Split to separate projects (paid tier or free a slot); Hub → true API-only. `signal_read` is already the API shape, so migration is mechanical. |
| MT-5 | n8n setup friction > 90 min, OR orchestration outgrows n8n cleanliness. | Fall to **scripts + GitHub Actions cron + pg_cron** (V1's documented fallback). Schema unchanged. |
| MT-6 | `pg_cron` jobs run elevated. | Keep computed-signal SQL minimal/reviewed; no secrets in job bodies; route anything touching external APIs/secrets through n8n. |

---

## 9. What this design deliberately does NOT do
No watchlist construction from external sources · no ingestion beyond the 7 seed signals + 3 contracts · no full two-way Notion sync (one-way + narrow HITL writeback) · no real-time push (15-min poll floor) · no auto-send DMs (HITL approve-before-publish) · no LinkedIn/X scraping · no scoring/activation (Phase 2) · no SCD Type-2 on entities (Tier 2; only light `valid_from/valid_to` on `relations`) · no vector/RAG (`vector` available but deferred) · no sixth content skill before R2 dashboard.

---

## 10. Judgment calls for Alex to sanity-check
1. **JC-0 — Superseding a LOCKED V1.** V2 re-opens V1 because the 2026-06-27 spine consolidation invalidated V1's dedicated-project assumption. V1 is preserved at `architecture_v1_superseded_2026-05-20.md`. Confirm you accept V2 as the new lock.
2. **JC-1 — 11 tables vs YED-45's named 6.** Added `entity_external_ids` (V1 locked xref), `topics` (Signals 4/5), `suppression` (hygiene §5), `source_state` + `ingestion_run` (D5). Confirm YED-45 scope expands to 11, or split the 5 adds into a YED-45b.
3. **JC-2 — UUID v4, not v7.** No `pg_uuidv7` on this instance. Acceptable, or vendor a v7 fn via `pg_tle` now?
4. **JC-3 — Identity keys as columns** (amends V1's EAV `entity_identity_keys` table). I chose columns + partial unique indexes for type-safety + DB-enforced dedup. Confirm.
5. **JC-4 — Hub coupling via `signal_read` view contract**, not an HTTP API. Confirm this satisfies the Hub's "APIs only" invariant in spirit (I argue it does, §6).
6. **JC-5 — Runtime: kept n8n (primary) + pg_cron, but de-time-boxing weakened V1's n8n rationale.** Lowest-confidence call (72%). If you'd rather go simplest-viable now, the fallback is scripts + GitHub Actions cron + pg_cron. Your call.
7. **JC-6 — eval-harness dependency direction** (carried from V1 Open Q #4): does gtm-os import eval-harness, or does eval-harness write to gtm-os's Supabase? Resolve before the eval table ships.

---

## 11. Sign-off
- [ ] Alex accepts V2 superseding V1 (JC-0).
- [ ] Decisions D0–D5 reviewed.
- [ ] Judgment calls JC-1 … JC-6 resolved.
- [ ] YED-45 scope confirmed (6 vs 11 tables).
- [ ] On sign-off, V2 locks; changes require an explicit re-open flag.

**Source docs:** `PROJECT_BRIEF.md` (threads #9, #10) · `Phase_0/02_hygiene_tier_1_spec.md` · `Phase_0/signal_seed_list.md` · `Phase_0/dedup_audit.md` · `Phase_0/inventory_findings.md` · V1 (superseded) · live `GTM_OS_HUB` state verified via Supabase MCP 2026-06-27.
