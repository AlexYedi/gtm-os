# Session Bootstrap Prompt — Signal Pipeline

**Purpose:** Paste this into a fresh Claude session (Claude Code CLI in this repo OR Claude.ai desktop) to bootstrap full project context without rehashing prior conversation.

**Update protocol:** Update the "Current task" section at the bottom whenever the active work changes. Update the "Locked decisions" table when something new is decided. Update the "Latest commit" line so the new session pulls a known-good revision.

---

## How to use this file

**Recommended: Claude Code CLI in this repo.** Once `MCP_SETUP.md` has been completed (one-time, ~15 min), Notion + HubSpot MCPs are wired into the repo via `.mcp.json` and available to every CLI session in this directory. No paste-and-sync round trip needed.

1. Confirm `.mcp.json` exists at repo root and `.env` has `HUBSPOT_PRIVATE_APP_TOKEN` set. If not, run through `MCP_SETUP.md` first.
2. Open Claude Code in the repo directory.
3. Run `/mcp` to verify Notion + HubSpot are connected (complete OAuth on first run for Notion).
4. Paste the "Bootstrap prompt" block below as your first message.

**Alternative: Claude.ai desktop.** Use only if CLI MCP setup hasn't been done yet. Notion + HubSpot must be connected as Claude.ai chat connectors. Paste the block below as your first message; Claude reads docs on demand.

---

## Bootstrap prompt

~~~
You are picking up an in-flight project mid-stream. Read this brief carefully before doing anything. Do not restate it back. Do not relitigate decisions already locked. Ask clarifying questions only on items not addressed below.

**⚠️ STATUS CORRECTION (2026-08-20) — read before acting on anything spine-related below.** The Supabase signal spine (`abkvgihlbwfloentugtd`) was **consolidated onto the canonical Empire graph and RETIRED** (YED-130, cutover 2026-08-10). As of **2026-08-20** it was cron-off'd, cold-exported (archive at `supabase/archive/spine-decommission-2026-08-20/`) and **deleted** the same day (YED-135, Done). **Do NOT restore it, re-run ingestion against it, or build on it.** The MI graph now lives on the Empire prod DB (`oicikjyzmxqfomrrqkvf`, A.Yedi account), read over REST. Every section below that treats this spine as the live system of record — the "next task" recommendations, the pg_cron/heartbeat keep-warm notes, and the "refresh event ingestion" step — is **HISTORICAL (pre-consolidation)**. Authoritative current state: `docs/THE_PLAN.md` (Current State) + `CLAUDE.md` (Status) + the Empire repo `docs/adr/`.

# Identity

I'm Alex — senior enterprise B2B SaaS professional (12+ years), currently Lead Enterprise Account Director at [employer], building toward a Clay-tier full-stack GTM engineer role ("$1M GTMEs" per Clay's own content). I have a working, shipped NYC AI/tech events intelligence pipeline — event-research + pre-event-content + pattern-synthesis skills writing to 6 interconnected Notion DBs and HubSpot via MCP, with Apollo enrichment. It's real and shipped.

The constraint: it's time-bound to IRL events, which caps signal volume, and the work product is currently framed as "events content pipeline" rather than GTM engineering portfolio. I'm building a parallel always-on Signal Pipeline + a live dashboard-as-portfolio Hub (its own repo `gtm-os-hub`, a Next.js app — supersedes the earlier Framer idea) to take the work product up several levels.

# The project shape

Two parallel workstreams:

- **Project A — Signal Pipeline.** Long-running, iterative, internal. Builds an always-on signal layer on top of the existing events pipeline (which is the first completed module, NOT being restarted). Maps to Clay's three-rung maturity model: data foundation → modeling → activation. **Phase 0 complete; Phase 1 architecture locked (`Phase_1/architecture.md`, YED-44); spine scaffolded (YED-45) AND now populated — first ingestion shipped (YED-108, PR #9, 2026-07-17): Signals 1 & 2 live, ~396 entities / 59 events / 452 signals.** The **topic-intelligence modeling layer (YED-110)** is largely SHIPPED (Slices 0 & 1A done + validated, 2026-08-06; Section B view contract applied + handed to the Hub). See "Current state + next task" below for what's next. Don't skip to activation.
- **Project B — The Hub.** A **live Next.js dashboard-as-portfolio in its OWN repo `AlexYedi/gtm-os-hub`** (cockpit + public two-view). It **supersedes the earlier Framer brochure** (amended 2026-06-13), reads gtm-os data over external APIs only (no shared code), and is **developed in its own session** — not this one.

This bootstrap is scoped to Project A.

# Repo + branch

- Repo: `AlexYedi/gtm-os`
- Active branch: `main`
- Latest commit on branch: see `git log -1`; post-migration commit includes `.mcp.json`, `MCP_SETUP.md`, `PROJECT_BRIEF.md`, `SESSION_BOOTSTRAP.md`, and `Phase_0/`
- Companion repo (events pipeline canonical, shared data plane): `AlexYedi/Empire_State_Events_Pipeline_Take_3`

If you're in Claude Code CLI in this repo, read files directly. If you're in Claude.ai desktop with GitHub MCP, read from the repo at that branch. Otherwise I'll paste file contents.

# Required MCP connections

This session expects these MCPs to be live:
- **Notion** (read/write — hosted at `https://mcp.notion.com/mcp` via the repo's `.mcp.json`, OR Claude.ai chat connector)
- **HubSpot** (read/write — `@hubspot/mcp-server` via the repo's `.mcp.json` with `HUBSPOT_PRIVATE_APP_TOKEN` in `.env`, OR Claude.ai chat connector)
- **GitHub** (for reading the repo if not in CLI)
- **Linear, PostHog** (nice-to-have, not blocking)

If Notion or HubSpot is not connected, STOP and tell me. The current task requires both. Setup instructions are in `MCP_SETUP.md`.

# Docs to read on demand (priority order, do not load eagerly)

Read these only when the current task requires them. The names are descriptive enough to know when to reach for each:

1. `docs/THE_PLAN.md` — **START HERE.** Master strategy doc; read its "Current State" block first. (Note: it was de-time-boxed 2026-06-27 — hours/cadence are historical.)
2. `Phase_1/architecture.md` — **the real, signed-off Phase 1 architecture** (V2). The authoritative system design.
3. `supabase/schema.md` — the deployed 11-table signal spine reference (grain, consumers, dedup).
4. `PROJECT_BRIEF.md` — historical Phase 0/1 brief; kept for the architectural-decision record that fed THE_PLAN.md.
5. `Phase_0/02_hygiene_tier_1_spec.md` — first-class living hygiene doc; reference for entity identity / dedup rules the spine operationalizes.
6. `Phase_0/inventory_findings.md`, `dedup_audit.md`, `signal_seed_list.md` — completed Phase 0 outputs feeding Phase 1.
7. `MCP_SETUP.md` / `MCP_FALLBACKS.md` — MCP + Supabase-access ladder. **Note:** Supabase is reached via REST/SDK with `sb_secret_` keys, NOT via MCP (retired to avoid cross-account token bleed).
8. Companion-repo references (read-only, in `AlexYedi/Empire_State_Events_Pipeline_Take_3`): `CLAUDE.md` for Notion DB schemas + HubSpot conventions.

# Locked decisions (do not relitigate without me explicitly flagging)

| Decision | Value |
|---|---|
| Project shape | Signal Pipeline + Hub, parallel, thin coupling |
| Events pipeline | First completed module, NOT restarted |
| Enterprise-grade | Production patterns proportionally — data contracts, schema rigor, idempotency, secrets hygiene, real logging, evals on LLM parts. NOT Kubernetes-for-one-user |
| Phase 0 framing | Exploration NOT build; data inventory + signal discovery + hygiene spec |
| Rung sequence | Foundation → Modeling → Activation. Don't skip ahead |
| Watchlist approach | DO NOT construct a watchlist from external sources. Let existing data reveal it |
| Distribution V1 | LinkedIn only, human-in-the-loop, 3–4 posts/week target |
| Budget | <$100/mo additional spend |
| Data spine | Supabase free tier |
| Workflow runtime | Vercel Workflow DevKit TABLED. Decide later |
| Hygiene | First-class workstream with own living document |
| Ethics | No LinkedIn / X scraping. Public APIs, RSS, official endpoints, my own data exports only |
| 9-domain overlay | Hybrid mechanism. Tiebreaker rule firm: build merits first. Sequenced AFTER strategy + details locked |

# Guardrails

- **Do not restart the events pipeline.** It's shipped. It's a module of Signal Pipeline.
- **Do not conflate the events pipeline with the job-hunt funnel.** Share Stages 1 and 4; different artifacts.
- **Do not ship a sixth content skill before the R2 measurement dashboard exists.** Clay red-flag #4.
- **No fabricated numbers.** If an MCP query fails or data is missing, report honestly. Never substitute estimates for measured values.
- **Inspect data before proposing fixes.** Don't theorize. CLAUDE.md has the schemas and gotchas.
- **Respect the active-project list.** gtm-os, eval-harness, scaffold-skill are active in root PROJECT_BRIEF.md. Flag overlap explicitly when it appears.

# Collaboration contract

- Ask clarifying questions when scope is ambiguous; cluster them so I can answer in bulk.
- Lead with a recommendation, not a neutral menu — tell me what you'd pick and why.
- Push back on me when I'm wrong. Honest, respectful, not always agreeing.
- State confidence honestly: percentage + plain language qualifier.
- When configuring any platform (Notion, HubSpot), specify every field explicitly. Don't assume defaults.
- Match my register: direct, commercially fluent, technically aware but not technically fluent.

# Current state + next task

**Planning reset (2026-10-30) — read `docs/THE_PLAN.md` first.** Its "Current State" block and the "Re-sequenced milestone plan — M4–M6" section are the live plan; the week-plan and Sprint 2 anchors below in this bootstrap are historical.

- **Track posture (three-track plan, 2026-10-30):** gtm-os is **Horizon 2** — skills and proof for quota-carrying commercial roles. **Empire runs first through year-end** (Dec 12 MI-graph go/no-go; Jan 1 2027 offer north star). gtm-os work until then is opportunistic only: **G-04 public-repo truth pass** (`docs/specs/gtm/`), University/cockpit slices on the Hub.
- **Next GTM build window: Q1 2027.** M5 (Jan–Feb): the GTM flagship — warm-path finder + evals + CASE.md — replanned onto honest dates that supersede the blown 2026-10-30 target (0%); start yields to the offer push; architecture review before any build. M6 (Mar): **Capstone 2 — Event-Driven Outbound Engine — ships whole by 2027-03-31**, opens with the re-anchored YED-55 arch review. The re-sequenced plan is a **DRAFT pending Alex's sign-off** — until the sign-off it is not the plan of record.
- **Specs:** `docs/specs/gtm/` (G-04 truth pass; G-05 re-sequenced milestones, draft). Cross-repo index: `Empire_State_Events_Pipeline_Take_3` → `docs/specs/README.md` (G-01…G-04). Linear: the old roadmap project is canceled — open work lives in the EMPIRE-STATE + GTM-OS teams; confirm priority there before starting.
- **Data plane:** the retired spine (`abkvgihlbwfloentugtd`) stays retired — nothing keeps it warm and it no longer exists: it was deleted on 2026-08-20 (YED-135). gtm-os reads the MI graph (`oicikjyzmxqfomrrqkvf`) over REST; the Hub consumes signals only via the `signal_read` view contracts on its own Supabase learning plane.
- **Repo health (pre-existing, not owned by the plan):** ~8.3k eslint errors, `tsc --noEmit` fails (`@types/node` missing), `turbo run lint/typecheck/test` execute 0 tasks — see `.obvious/obvious.md`.

**First move:** read `AGENTS.md` + `docs/THE_PLAN.md` (Current State + re-sequenced milestones); confirm priority in Linear; keep everything docs-first until the re-sequencing is signed off.

## Process expectations

- Read `Phase_1/architecture.md` before touching the spine — it locks entity-ID strategy, Notion↔Supabase relationship, conflict-log location, runtime, and the `signal`-schema isolation boundary. Then read `supabase/schema.md` for the deployed table contracts.
- Supabase is REST/SDK + `sb_secret_` keys, **not MCP.** Never assume column names — pull the schema (`supabase/schema.md` or a live `Accept-Profile: signal` OpenAPI read) first.
- **No fabricated numbers.** If the spine is unreachable or a query fails, report honestly (see the blocker above for a live example).
- Notion + HubSpot MCPs: confirm live if the task needs them. For ingestion, they're the likely first sources.

Begin by reading `docs/THE_PLAN.md` (Current State block) + `Phase_1/architecture.md` + `Phase_1/topic_intelligence_spec.md`, confirming the spine's reachability (populated but may be idle-paused — see above), then proceed on the current open front (YED-110 modeling / Capstone 2), confirming priority in Linear first.
~~~

---

## Field notes for Alex

- The fenced block above is what gets pasted. Everything outside it is meta-instructions for you.
- If the desktop session can't read from GitHub directly, paste `docs/THE_PLAN.md` and `Phase_1/architecture.md` directly into the chat after the bootstrap.
- This file is a living artifact. Whenever the active workstream changes, update the "Current state + next task" section — keep it pointed at the real open front (mirror the Linear roadmap project, don't duplicate its status).
