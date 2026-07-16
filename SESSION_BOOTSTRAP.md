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

# Identity

I'm Alex — senior enterprise B2B SaaS professional (12+ years), currently Lead Enterprise Account Director at [employer], building toward a Clay-tier full-stack GTM engineer role ("$1M GTMEs" per Clay's own content). I have a working, shipped NYC AI/tech events intelligence pipeline — event-research + pre-event-content + pattern-synthesis skills writing to 6 interconnected Notion DBs and HubSpot via MCP, with Apollo enrichment. It's real and shipped.

The constraint: it's time-bound to IRL events, which caps signal volume, and the work product is currently framed as "events content pipeline" rather than GTM engineering portfolio. I'm building a parallel always-on Signal Pipeline + a live dashboard-as-portfolio Hub (its own repo `gtm-os-hub`, a Next.js app — supersedes the earlier Framer idea) to take the work product up several levels.

# The project shape

Two parallel workstreams:

- **Project A — Signal Pipeline.** Long-running, iterative, internal. Builds an always-on signal layer on top of the existing events pipeline (which is the first completed module, NOT being restarted). Maps to Clay's three-rung maturity model: data foundation → modeling → activation. **Phase 0 (exploration) is complete; Phase 1 architecture is locked (`Phase_1/architecture.md`, YED-44) and the Supabase signal spine is scaffolded (`supabase/schema.md`, YED-45, 11 tables, 0 rows).** Next step is first signal ingestion (YED-56). Don't skip to activation.
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

**Phase 0 is complete. Phase 1 architecture is locked. The Supabase spine is scaffolded (empty).** Do not re-run Phase 0 inventory — it's done (`Phase_0/inventory_findings.md`).

**The open front (source of truth = the Linear roadmap project):**

1. **YED-56 — first signal ingestion (the real next build).** The `signal` spine exists in Supabase but has 0 rows. Build the runtime path that writes real rows: a `lib/supabase` REST client using `SUPABASE_SPINE_URL` + `SUPABASE_SPINE_SERVICE_KEY` with `Accept-Profile: signal` / `Content-Profile: signal`, then one ingestion source end-to-end. This is the "prove the spine" step — Capstone 1. **Do NOT jump to Capstone 2 (YED-59) before this proves out.**
   - ⚠️ **Blocker (found 2026-07-11):** the spine's Supabase project host does not resolve (NXDOMAIN — free-tier project paused/deleted). Restore/unpause it in the Supabase dashboard and re-verify (11 tables, 0 rows over REST) before writing ingestion code.
2. **YED-42 — finalize + publish R1 writeup.** V0 draft at `Phase_0/R1_event_intelligence_writeup.md`; blocked on YED-41 (Alex's manual LinkedIn export). Anchor-1 portfolio deliverable.
3. **YED-41 — inventory Parts B+D** (LinkedIn content performance + cadence). Alex-led data pull; unblocks YED-42.

**Hub work (YED-98/99/83) lives in the `gtm-os-hub` repo and its own session — not here.**

## Process expectations

- Read `Phase_1/architecture.md` before touching the spine — it locks entity-ID strategy, Notion↔Supabase relationship, conflict-log location, runtime, and the `signal`-schema isolation boundary. Then read `supabase/schema.md` for the deployed table contracts.
- Supabase is REST/SDK + `sb_secret_` keys, **not MCP.** Never assume column names — pull the schema (`supabase/schema.md` or a live `Accept-Profile: signal` OpenAPI read) first.
- **No fabricated numbers.** If the spine is unreachable or a query fails, report honestly (see the blocker above for a live example).
- Notion + HubSpot MCPs: confirm live if the task needs them. For ingestion, they're the likely first sources.

Begin by reading `docs/THE_PLAN.md` (Current State block) + `Phase_1/architecture.md`, confirming the spine's reachability, then proceed on YED-56.
~~~

---

## Field notes for Alex

- The fenced block above is what gets pasted. Everything outside it is meta-instructions for you.
- If the desktop session can't read from GitHub directly, paste `docs/THE_PLAN.md` and `Phase_1/architecture.md` directly into the chat after the bootstrap.
- This file is a living artifact. Whenever the active workstream changes, update the "Current state + next task" section — keep it pointed at the real open front (mirror the Linear roadmap project, don't duplicate its status).
