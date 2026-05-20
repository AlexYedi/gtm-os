# Phase 1 Architecture — gtm-os Signal Pipeline

**Status:** V1 LOCKED, 2026-05-20. Reviewed by `alex:cto-principal-architect` per `docs/THE_PLAN.md` W2 (executed early in W0).
**Owner:** Alex Yedibalian. **Reviewer cadence:** at every Capstone arch review (next: W14).
**Scope:** the architecture under Capstone 1 (Phase 1 Signal Pipeline). Capstone 2 will get its own review.

---

## TL;DR

Supabase Postgres is the analytical spine and the system of record for the **signal layer**. Notion remains the system of record for **human workspace artifacts** (Events, People, Companies, Topics, Content Drafts). Sync runs one-way Notion → Supabase by default, with a narrow allow-list of Supabase → Notion writebacks (signal scores, conflict flags, own-funnel metrics) gated by HITL. Entities use a **hybrid Entity-ID model**: a Supabase-minted `entity_id` (UUIDv7) is the canonical join key; a mapping table holds Notion page IDs, HubSpot object IDs, and Apollo IDs as alternates. The orchestration runtime for Phase 1 is **n8n** (Alex has the chops, no new runtime to learn, MCP coverage already in place) with a thin escape hatch to Node scripts run via `pnpm` for anything n8n cannot model cleanly. Conflict log lives in a Supabase table. Idempotency is a `(source, source_record_id|content_hash)` unique constraint at insert with a nightly dedup sweep on entity_resolution rules. Secrets stay in `.env` (dev) / Vercel env (the future read-only dashboard) / n8n credentials store (the runtime). Eval results land in Supabase **and** are mirrored to a markdown artifact in the repo for portfolio value. The R2 measurement dashboard is built as a **custom Next.js page in this repo** reading Supabase via RLS-protected views, deployed to Vercel. **The Hub (Project B) shares only the Supabase spine** read-only; no schema concessions made for it. **Explicit tech debt:** the current Turborepo scaffold is the Vercel knowledge-agent template — wrong shape for the Signal Pipeline; W3 starts with replacing `apps/app` with a minimal Next.js app for the dashboard and standing up `packages/ingest` as the n8n-callable code surface.

---

## Decisions

### 1. Entity-ID strategy across Notion ↔ Supabase

**Recommendation:** Hybrid. A Supabase-minted `entity_id` (UUIDv7) is the canonical, invariant identifier. A separate `entity_external_ids` mapping table holds Notion page IDs, HubSpot object IDs, Apollo IDs, content hashes. Identity-resolution on ingest matches against `entity_external_ids` first (cheap), then against `entity_identity_keys` (email_lower, linkedin_url_normalized, company_domain) per hygiene spec §1.1.

**Schema sketch:**
```sql
entities (entity_id uuid pk, entity_type text, created_at, ...)
entity_external_ids (entity_id fk, source text, external_id text, unique(source, external_id))
entity_identity_keys (entity_id fk, key_type text, key_value text, unique(key_type, key_value))
```

**Worked example — Avi Flombaum (from inventory_findings §1.2):** Notion page `347d3699-c2db-8129-bab9-e234baddaf1f`, no HubSpot ID (Part C blocked), no Apollo ID, no email captured. On first ingest:
1. Mint `entity_id = uuid7()`
2. Insert `(entity_id, 'notion', '347d3699-...')` into `entity_external_ids`
3. Insert `(entity_id, 'linkedin_url_normalized', 'linkedin.com/in/aviflombaum')` into `entity_identity_keys`
4. When HubSpot Part C lands and a contact for Avi exists, insert `(entity_id, 'hubspot_contact', '<id>')` — no merge needed, the join just gets richer.
5. If Apollo enriches and reveals `[redacted-email]`, insert `(entity_id, 'email_lower', '[redacted-email]')`.

**Rationale:** Notion page IDs as canonical fails the moment HubSpot or any non-Notion source becomes a write target — page IDs aren't portable. Supabase-minted UUIDs as canonical with a mapping table is the only design that survives a third or fourth source being added in Phase 2.

**Trade-offs:** Two joins instead of one for the common "look up by Notion page ID" query. Solved by a materialized view `v_entity_by_notion_id`. Slightly heavier writes on ingest.

**Tech debt flagged:** Backfilling `entity_external_ids` from existing Notion DBs is W3 work, not free. Sizing: ~270 rows across People + Companies + Topics + Events + Drafts. One-shot script, ~30 min once schema is up.

---

### 2. Notion ↔ Supabase relationship

**Recommendation:** **One-way Notion → Supabase by default**, with a narrow allow-list of Supabase → Notion writebacks. Notion stays the human workspace; Supabase is the analytical spine + the system of record for derived signal data.

**Allow-listed Supabase → Notion writes (Phase 1):**
- `dm_priority_score` (Signal 1/2) → People DB property
- `is_talent_density` flag (Signal 3) → Events DB property
- `pairing_id` (Signal 4) → Events DB rollup property
- `met_in_person` (Signal 6) → People × Event relation property
- `sent` / `replied_at` (Signal 7) → Content Drafts properties

Every writeback is an explicit n8n node with a HITL approval step until the eval harness reports stable LLM-derived attribute quality.

**Read/write paths:**

| Event | Path |
|---|---|
| New Event lands in Notion (existing events pipeline) | Notion (system of record) → n8n cron poll (15 min) → Supabase `events` upsert keyed on `notion_page_id` via `entity_external_ids` → derive Signals 3, 4, 5 |
| Content Draft created in Notion | Notion (SoR) → n8n poll → Supabase `content_drafts` upsert. No writeback to Notion in Phase 1. |
| Signal scored in Supabase | Supabase derives → n8n writeback to Notion People/Events with `dm_priority_score` property |
| Outcome closed (DM replied, met in person) | Manual entry in Notion (Alex) → n8n poll → Supabase `funnel_events` insert → recompute Signal 6/7 rollups |

**Rationale:** Two-way mirror is the classic data-sync anti-pattern; conflict resolution and loop detection eat the savings. Notion's HITL UX is best-in-class for Alex's workflow; replicating it in Supabase Studio is a non-goal. Supabase wins as the analytical surface because SQL > Notion query, plus it's the only path to the R2 dashboard.

**Trade-offs:** Notion will be 0–15 minutes stale on derived attributes (the writeback cycle). Acceptable for content cadence.

**Tech debt flagged:** No optimistic conflict detection on the writeback path. If Alex hand-edits `dm_priority_score` in Notion between cycles, the next writeback clobbers it. Mitigation: writeback fields are clearly marked "system-managed" in Notion property descriptions; conflict log captures any divergence (see §3).

---

### 3. Conflict log location

**Recommendation:** **Supabase table.** `conflict_log` with structured columns.

**Schema:**
```sql
conflict_log (
  conflict_id uuid pk,
  detected_at timestamptz,
  entity_id uuid references entities,
  entity_type text,
  field_name text,
  source_winner text,
  value_winner text,
  source_loser text,
  value_loser text,
  resolution text,             -- 'priority_rule' | 'manual_override' | 'pending'
  resolution_at timestamptz,
  resolution_by text,          -- 'system' | 'alex'
  ingestion_run_id uuid
)
```

**Worked example — the ERA dedup (inventory §3.1, dedup_audit.md):**
On the W3 backfill run, the dedup pass detects two Notion company records for ERA (`347d3699-...-8eb` canonical, `347d3699-...-72d` merge). It writes:

```
conflict_id=..., entity_id=<ERA entity_id>, entity_type='company',
field_name='notion_page_id',
source_winner='notion', value_winner='347d3699-c2db-81e0-...-572d',
source_loser='notion',  value_loser='347d3699-c2db-816a-...-a23c',
resolution='priority_rule', resolution_at=now(),
resolution_by='system',
ingestion_run_id=<run uuid>
```

A second row logs the actual merge action (which fields from the loser got merged into the winner). The conflict_log is then surfaced on the R2 dashboard with a "needs review" filter.

**Rationale:** Queryable. Joinable to `entities` and `ingestion_runs`. The portfolio narrative ("here's our conflict-handling rate, here's resolution latency, here's the manual-override fraction") writes itself off this table. Notion page is too unstructured; an append-only file in repo is fine for a one-developer system but breaks the moment Phase 2 wants to compute conflict-rate metrics.

**Trade-offs:** Higher initial bar than a markdown log. Mitigated by templating the inserts in the n8n dedup node.

**Tech debt flagged:** No automated alerting on conflict-rate spikes. Phase 2 should add a PostHog event or a Slack webhook when conflicts/day > 2σ.

---

### 4. Runtime choice

**Recommendation:** **n8n for Phase 1**, hosted on n8n Cloud free tier (or self-hosted on Railway $5/mo if free tier limits bite).

**Comparison:**

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **n8n** | Alex has chops, MCP coverage already wired, visual debugging, Notion/HubSpot/Supabase nodes exist, free tier covers 5k execs/mo | UI-edited workflows are harder to PR-review; version control via `n8n_workflows/*.json` export | **PICK** |
| Inngest | Code-native, durable execution, great DX | New runtime to learn at the worst time (Capstone 1 build); free tier generous but auth/setup eats W3 | Defer to Capstone 2 if event-driven outbound needs durable orchestration |
| Supabase edge functions + cron | Same vendor as data plane, simplest secrets story | No retry/observability layer; Alex would build the orchestration discipline from scratch; eats hours that should go to Capstone 1 | Reject for Phase 1 |
| Plain cron + Node scripts | Lowest cognitive overhead | Same observability gap as Supabase edge; doesn't survive a second contributor | Reject |
| Vercel Workflow DevKit | (Locked OUT — bad docs / robustness per locked decisions) | — | OUT |

**Migration path if we swap later:** n8n workflows are JSON-exported into `n8n_workflows/` in the repo (already MCP-supported). The actual "business logic" — dedup rules, identity resolution, signal computation — lives in `packages/ingest` as TypeScript modules that n8n nodes call via HTTP (a thin `apps/ingest-api` Next.js route). Swapping n8n for Inngest in Phase 2 means re-wiring triggers; the logic doesn't move.

**Rationale:** Alex's hour budget is the binding constraint. n8n is the only runtime where the first signal flows end-to-end in W3. Inngest is the right Phase 2 answer when the system needs durable multi-step LLM-tool chains; not Phase 1.

**Trade-offs:** Workflow versioning via JSON exports is clunky. Eval harness against n8n workflows is awkward (no native test harness).

**Tech debt flagged:** Business logic in n8n nodes is hard to unit-test. Mitigation: keep nodes thin, push logic to TypeScript modules in `packages/ingest`.

---

### 5. Idempotency + dedup at the data-plane boundary

**Recommendation:** Two-layer.

**Layer A — Insert-time idempotency.** Every ingestion table has a unique constraint on `(source, source_record_id)` when source provides a stable ID, else `(source, content_hash)` per hygiene spec §2. Inserts use `ON CONFLICT ... DO UPDATE SET last_verified_at = now(), last_modified_at = now()` so re-ingests are no-ops modulo timestamp refresh.

**Idempotency keys by source:**

| Source | Key |
|---|---|
| Notion (Events, People, Companies, Topics, Drafts) | `('notion', notion_page_id)` |
| HubSpot contacts | `('hubspot_contact', hubspot_id)` |
| HubSpot companies | `('hubspot_company', hubspot_id)` |
| Apollo enrichments | `('apollo', apollo_person_id)` |
| RSS feeds (luma, partiful, news) | `('rss.<feed_name>', item_guid)` else `content_hash` |
| n8n run logs | `('n8n', execution_id)` |

**Layer B — Nightly dedup sweep.** A 2am UTC n8n cron runs the entity-identity-resolution pass per hygiene spec §1.1 — matches on email_lower / linkedin_url_normalized / company_domain. Any newly-detected duplicate pair is written to `conflict_log` with `resolution='pending'`, surfaced on the R2 dashboard for Alex to manually approve before the merge fires.

**Why both?** Insert-time catches re-ingests (same source, same ID). Nightly catches cross-source duplicates (same person, Notion + HubSpot + Apollo). Insert-time alone misses the ERA/Betaworks/Zo cases because they're *within* one source (Notion), with different page IDs. Nightly alone is too slow — a dup landing at 9am would be visible to scoring code until 2am the next day.

**Trade-offs:** Two paths to maintain. Mitigated because both call the same `resolveEntity()` function from `packages/ingest`.

**Tech debt flagged:** The "approve merge" UI is the R2 dashboard's job (§8) — until that ships, manual merges happen via SQL. Acceptable for W3–W6.

---

### 6. Secrets handling

**Recommendation:** Least-surprise tiering.

| Secret | Location | Why |
|---|---|---|
| Local dev (HUBSPOT_PRIVATE_APP_TOKEN, NOTION_TOKEN, SUPABASE_SERVICE_ROLE) | `.env` (gitignored) | Already in place per MCP_SETUP.md |
| Vercel-deployed Next.js dashboard | Vercel project env | Standard Vercel pattern; pulls via `vercel env pull` for local |
| n8n workflow credentials | n8n built-in credentials store | Native — encrypted at rest, scoped per workflow |
| Supabase service role key | Supabase Vault for the keys n8n writes back with; `.env` for local | Vault is free tier, integrates with edge functions if Phase 2 needs them |
| OpenAI / Anthropic API keys for eval harness | `.env` locally; Vercel env for any CI runs | One source of truth; rotate via Vercel CLI |

**Hard rules:**
- Never commit `.env`. `.gitignore` already excludes it.
- `.env.example` ships with placeholder values + comments per `MCP_SETUP.md` convention.
- Service-role keys never reach the browser. Dashboard uses Supabase anon key + RLS policies; service-role stays server-side only.

**Trade-offs:** Three secret stores (n8n, Vercel, Supabase Vault) is more than one. Acceptable because each has a clear scope.

**Tech debt flagged:** No rotation schedule. Add a Linear recurring issue for quarterly rotation in W12 retro.

---

### 7. Eval coupling

**Recommendation:** **Both Supabase and repo.** Eval results land in a `eval_runs` Supabase table as the structured source (queryable, joinable, dashboardable). A markdown summary lands in `evals/<date>_<skill>.md` in the repo as the portfolio asset.

**Schema:**
```sql
eval_runs (
  run_id uuid pk,
  skill_name text,           -- 'event-research', 'pre-event-content', ...
  model text,                -- 'claude-opus-4', etc.
  ran_at timestamptz,
  golden_set_version text,   -- 'v1', 'v2', ...
  pass_count int, fail_count int,
  rubric_summary jsonb,      -- aggregated judge scores
  artifact_path text         -- pointer to repo markdown
)
```

**CI hook:** A GitHub Action runs the eval harness against any PR that touches `.claude/skills/event-research.md` (or other listed skills) and `packages/agent`. Pass/fail gates the PR. Result row written to Supabase via service-role key in Action secrets.

**Coordination with `eval-harness` sibling project:** Eval harness defines the rubric + judge prompt + golden set. gtm-os imports it as a workspace dependency or fetches the JSON config at run time. Avoid duplication — the rubric lives in one place.

**Trade-offs:** Two storage locations to keep in sync. Mitigated by treating the markdown as a generated artifact from the Supabase row.

**Tech debt flagged:** No drift detection (eval pass rate trending down silently). Add a PostHog metric in W7 when eval harness ships per D5 benchmark.

---

### 8. R2 measurement dashboard surface

**Recommendation:** **Custom Next.js page in this repo, deployed to Vercel.**

**Comparison:**

| Option | Cost | Skill fit | Verdict |
|---|---|---|---|
| **Custom Next.js page** | $0 (Vercel hobby) | Alex's existing TS + portfolio asset | **PICK** |
| Hex | Free tier is 5 projects, then $$$ | Great SQL DX but unfamiliar | Reject — budget + skill |
| Supabase Studio | $0 | Built-in, no styling | Use as internal back-office; not the R2 deliverable |
| Metabase | $0 self-hosted, but ops overhead | Heavyweight for one user | Reject |

**Architecture:** `apps/dashboard/app/` (Next.js App Router). Server Components read Supabase via service-role on the server, pass to client charts via props. RLS policies enforced; anon key never used here. Charts via `recharts` (small bundle, sufficient).

**Pages to ship in W9:**
- `/` — funnel: posts published → DMs sent → replies → meetings
- `/signals` — signal precision rolling 30d, per signal type
- `/conflicts` — pending and recent resolutions
- `/runs` — recent n8n + ingestion-run health

**Rationale:** This dashboard IS a D3 capstone artifact. Building it in Hex makes the portfolio story weaker ("I configured a Hex dashboard"). Building it in Next.js makes it stronger ("I built a measurement plane on top of my own analytical spine"). Skill-fit and budget align; ship it.

**Trade-offs:** More upfront work than Hex. Mitigated by ~3 hours for V0.

**Tech debt flagged:** No auth on the dashboard initially — Vercel project is private + Vercel SSO is the only access gate. Add Clerk in Phase 2 if a second viewer needs read access.

---

### 9. Hub / front-end coupling

**Recommendation:** The Hub (Project B Framer site / interactive HTML plan-tracker) is a **read-only consumer** of Supabase. Specifically, it reads from a set of `v_public_*` views that expose only what's safe for the public web. No schema concessions for the Hub. No PII (emails, LinkedIn URLs) in any `v_public_*` view.

**Constraints flagged:**
- The plan-tracker UI Alex just asked about should connect via Supabase anon key + RLS-protected `v_public_*` views, or via a thin Next.js API route in the dashboard app — pick one. Recommend the latter (centralizes auth posture).
- If the Hub is hosted on Framer (not Vercel), CORS must be configured on the dashboard's API routes for the Framer domain.
- No write paths from the Hub. Period. Hub is consumption-only.

**Does this affect any of the above 8 decisions?** No. Entity-ID strategy, Notion↔Supabase direction, conflict log, runtime, idempotency, secrets, eval, dashboard — all unchanged. The Hub coupling is strictly a read-side concern that gets solved at the RLS-view layer.

**Tech debt flagged:** First time `v_public_*` exposure is built, audit it. PII leaks here are the most likely Phase 1 mistake.

**V1 plan-tracker note (this session):** The first version of the plan-tracker at `apps/plan-tracker/index.html` is **IndexedDB-only** — zero Supabase coupling. Migration to the `v_public_*` read path is W9+ work, after the spine is up and the dashboard exists. Documented in the tracker's footer.

---

## System diagram

```
                ┌──────────────────────────────────────────────────────────┐
                │                  HUMAN WORKSPACE (Notion)                 │
                │  Events · People · Companies · Topics · Content Drafts    │
                │                  System of Record for                      │
                │                workspace artifacts (Alex's UI)             │
                └──────────────────────────────────────────────────────────┘
                              │  (poll every 15 min)         ▲
                              ▼                              │ (HITL writebacks:
                ┌──────────────────────┐                     │  dm_priority_score,
                │      n8n (Cloud)     │                     │  is_talent_density,
                │  - Notion poll       │─────────────────────┤  met_in_person,
                │  - HubSpot sync      │                     │  sent/replied_at)
                │  - RSS ingest (luma) │                     │
                │  - Apollo enrich     │                     │
                │  - Dedup sweep 2am   │                     │
                │  - Signal compute    │                     │
                │  - Writeback nodes   │─────────────────────┘
                └──────────────────────┘
                              │ (call out for business logic)
                              ▼
                ┌──────────────────────┐
                │  packages/ingest     │
                │  (TS modules:        │
                │   resolveEntity,     │
                │   computeSignal[1-7])│
                └──────────────────────┘
                              │
                              ▼
                ┌──────────────────────────────────────────────────────────┐
                │                ANALYTICAL SPINE (Supabase)                │
                │                                                            │
                │  entities · entity_external_ids · entity_identity_keys    │
                │  events · people · companies · topics · content_drafts    │
                │  signals · signal_attributions · funnel_events            │
                │  conflict_log · ingestion_runs · eval_runs · suppression  │
                │                                                            │
                │  + v_public_* views for Hub consumption                   │
                │  + RLS on every table                                      │
                └──────────────────────────────────────────────────────────┘
                              │                              │
                              ▼                              ▼
                ┌──────────────────────┐         ┌──────────────────────┐
                │  apps/dashboard      │         │  apps/plan-tracker   │
                │  Next.js R2 dash     │         │  (V1: IndexedDB only;│
                │  (Vercel hobby)      │         │   V2: v_public_*)    │
                └──────────────────────┘         └──────────────────────┘
                              │
                              ▼
                ┌──────────────────────────────────────────────────────────┐
                │              DESTINATIONS (HITL approve)                  │
                │   LinkedIn (manual paste from Notion drafts, Phase 1)     │
                │   HubSpot (writeback via n8n in Phase 2)                  │
                └──────────────────────────────────────────────────────────┘
```

---

## What this enables / what it explicitly does NOT support

**Enabled in Phase 1:**
- All 7 signals from `signal_seed_list.md` ingested or instrumented
- ERA / Betaworks / Zo Computer dedup cleaned with audit trail
- R2 measurement dashboard live before any next content skill (Clay red-flag #4 honored)
- Eval harness benchmark for `event-research` skill (D5 W7)
- Portfolio narrative: "I built a typed analytical spine with first-class hygiene + conflict logging + evals on the LLM parts"

**Explicitly NOT supported in Phase 1:**
- Two-way Notion sync (one-way + narrow writeback only)
- Real-time push from Notion (15-min poll is the floor)
- Auto-send DMs (HITL approve-before-publish stays per locked decisions)
- LinkedIn / X scraping of any kind (ethics rule)
- Multi-user dashboard (single-user Vercel SSO is enough)
- A separate microservice per signal (modular monolith in `packages/ingest`)
- Vector store / RAG (deferred to Phase 2 per PROJECT_BRIEF.md open thread #3)
- Capstone 2's event-driven outbound engine (separate arch review at W14)

---

## Open questions (needs Alex input)

1. **HubSpot Part C unblock.** Inventory was blocked on `HUBSPOT_PRIVATE_APP_TOKEN`. Phase 1 W3 backfill assumes HubSpot data lands. If still blocked, signals 1/2 work on Notion data alone (acceptable) but conflict log won't catch cross-source dups until HubSpot connects.
2. **n8n hosting.** Cloud free tier (5k execs/mo) likely fine for Phase 1 volume (~1k execs/mo estimated). Self-host on Railway only if Alex wants the ops-experience portfolio note. Default: Cloud.
3. **Existing Turborepo scaffold.** Repo currently holds the Vercel knowledge-agent template (`@savoir/monorepo`, Nuxt app). Plan assumes W3 replaces `apps/app` with a Next.js dashboard and adds `packages/ingest`. **Confirm: rip out the Nuxt scaffold, or fork off a clean branch and rebuild?** Recommend rip-out — the scaffold doesn't serve Phase 1.
4. **eval-harness coordination.** Phase 1 eval table schema in §7 assumes eval-harness is the rubric author. Confirm the workspace dependency direction (does gtm-os import eval-harness, or does eval-harness write to gtm-os's Supabase)?

---

## Recommended W1–W2 sequencing

Given 6–10 hrs/wk, here's the concrete order. W1 is Phase 0 closeout per THE_PLAN.md; this doc IS the W2 deliverable.

**W1 (2026-05-25 → 2026-05-31):**
- Mon (30 min): Draft LinkedIn post — "Why I'm writing the architecture doc before any code"
- Tue (60 min): Mode SQL tutorial continues (D4)
- Sat (3 hrs): Close YED-41 — Parts B + D inventory writeup
- Sun (2 hrs): Phase 0 closeout writeup, ready for Friday publish

**W2 (2026-06-01 → 2026-06-07):**
- Mon (30 min): Draft this-week LinkedIn post — "Architecture decision: choosing the runtime for Signal Pipeline Phase 1"
- Tue (60 min): Mode SQL tutorial finishes
- Sat (3 hrs):
  - Provision Supabase project + apply migration `00_init_entities.sql` (entities, entity_external_ids, entity_identity_keys)
  - Spin up n8n Cloud account, wire Notion + Supabase credentials
- Sun (2 hrs):
  - Apply migration `01_hygiene_tables.sql` (conflict_log, suppression, ingestion_runs)
  - First n8n workflow: Notion Events DB → Supabase `events` table, idempotent upsert
  - Ship Friday post on architecture decisions

**W3 (start of Month 1 core build):**
- Backfill 270 existing Notion records into `entities` + `entity_external_ids`
- Run ERA/Betaworks/Zo dedup, log to `conflict_log`, write audit-trail rows
- Replace Nuxt scaffold in `apps/app` with minimal Next.js dashboard skeleton
- Stand up `packages/ingest` with `resolveEntity()` as first export

**If W2 hits friction:** the locked fallback per THE_PLAN.md risk #2 is "ship the simplest viable option (Supabase + cron + scripts) and migrate later." n8n is two clicks away from that fallback; don't burn W2 on n8n setup if it eats more than 90 minutes — drop to Supabase pg_cron + scripts in `packages/ingest` and revisit at end of Month 1.

---

## Constraint pushback (read before locking)

Two flags. Both stay within current locks; raising for visibility.

**Flag 1 — Vercel Workflow DevKit lock-out.** With n8n picked for Phase 1, this is moot. But: if Capstone 2's outbound engine needs durable multi-step LLM-tool execution with crash-safe step replay, n8n is weaker than Inngest. Recommend revisiting the WDK lock at W14 architecture review (Capstone 2). Don't relitigate now; budget it as a known W14 decision.

**Flag 2 — Supabase free tier.** Free tier is 500MB storage, 2GB egress, 50k MAU on auth. Phase 1 volume is fine. The R2 dashboard hitting Supabase from Vercel will consume egress. If egress crosses 1.5GB/mo by W10, the upgrade to Supabase Pro ($25/mo) is the cleanest first dollar spent — squarely inside the $100/mo budget. Recommend a Linear issue for "monitor Supabase egress weekly" starting W6.

No other lock leads to a clearly worse outcome than relaxing it. The constraints are calibrated.

---

**Sign-off:** This doc, once committed at `Phase_1/architecture.md`, locks decisions 1–9. Any change requires an explicit "relitigate" flag in a Linear issue. Next review: W14 (Capstone 2 architecture).
