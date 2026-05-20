@~/Documents/GitHub/alex-agents-skills/Me/canonical-claude-md.md

<project_architecture>
## Signal Pipeline (gtm-os) — Project A

### Purpose
Build an always-on signal layer that decouples content + outreach from IRL events, increases volume of high-quality specific material, and produces rung-1 (data foundation) + rung-2 (data modeling) portfolio assets along the way. The existing Empire State events pipeline is the **first completed module**, not something being rebuilt.

The arc: move from "NYC AI events content creator" → "Clay-tier full-stack GTM engineer candidate with a defensible portfolio."

### Status (as of 2026-04-21)
Phase 0 scaffolded — exploration, NOT build. Five docs committed in `Phase_0/`. Phase 0 execution blocked on MCP access from Claude Code CLI (resolved via repo-local `.mcp.json`; see `MCP_SETUP.md`).

### Authoritative project docs (read on demand)
- **`PROJECT_BRIEF.md`** — single resume-from-cold doc. Locked decisions, shipped artifacts, blockers, todos, the arc to Phase 2. Read this FIRST in any fresh session.
- **`SESSION_BOOTSTRAP.md`** — paste-in bootstrap prompt for a new Claude session. Includes identity, guardrails, locked decisions, current task. Update its "Current task" section when active work changes.
- **`Phase_0/README.md`** — Phase 0 overview + execution order.
- **`MCP_SETUP.md` / `MCP_FALLBACKS.md`** — MCP server install + verification ladder.
- **Companion repo** (`AlexYedi/Empire_State_Events_Pipeline_Take_3`) — events pipeline canonical, shared data plane. Read its `CLAUDE.md` for Notion DB schemas + HubSpot conventions.

### Locked decisions — do NOT relitigate without an explicit flag
| Decision | Value |
|---|---|
| Project shape | Signal Pipeline (long-running) + Hub (parallel sprint). Thin coupling. |
| Events pipeline | First completed module, NOT restarted. |
| Enterprise-grade interpretation | Production patterns proportionally — data contracts, schema rigor, idempotency, secrets hygiene, real logging, evals on LLM parts. NOT Kubernetes-for-one-user. |
| Phase 0 framing | Exploration NOT build. Data inventory + signal discovery + hygiene spec. |
| Rung sequence | Foundation → Modeling → Activation. Don't skip to activation. |
| Watchlist approach | DO NOT construct a watchlist from external sources. Let existing data (what Alex has actually acted on) reveal it. |
| Distribution V1 | LinkedIn only, human-in-the-loop approve-before-publish, 3–4 posts/week target. |
| Budget | <$100/mo additional spend. Revisit only when we can name exactly what value is choked by lack of spend. |
| Data spine | Supabase free tier. |
| Workflow runtime | Vercel Workflow DevKit TABLED. Decide later based on actual Phase 1 needs. |
| Hygiene workstream | First-class writeup with own living document and changelog. |
| Ethics | No LinkedIn scraping. No Twitter/X scraping. Public APIs, RSS, official endpoints, and Alex's own data exports only. |
| 9-domain overlay | Hybrid mechanism. Tiebreaker rule firm: build merits first, overlay is tiebreaker. Sequenced AFTER strategy + details locked. |

### Project-specific guardrails
- **Do not restart the events pipeline.** It's shipped. It's a module of Signal Pipeline.
- **Do not conflate the events pipeline with the job-hunt funnel.** They share Stages 1 and 4; different artifacts.
- **Do not ship a sixth content skill before the R2 measurement dashboard exists.** (Clay red-flag #4.)
- **No fabricated numbers.** If an MCP query fails or data is missing, report honestly. Never substitute estimates for measured values.
- **Respect the active-project list.** gtm-os, eval-harness, scaffold-skill are active. Flag overlap explicitly when it appears.

### Required MCP connections
- **Notion** (read/write — hosted at `https://mcp.notion.com/mcp` via repo's `.mcp.json`)
- **HubSpot** (read/write — `@hubspot/mcp-server` via repo's `.mcp.json` with `HUBSPOT_PRIVATE_APP_TOKEN` in `.env`)
- **Linear, PostHog, Supabase, Granola, Vercel, Gmail, Google Calendar, n8n** — enabled via `.claude/settings.local.json`

If Notion or HubSpot is not connected for a Phase 0 inventory task, STOP and report. Setup instructions are in `MCP_SETUP.md`.

### Active branch context
Phase 0 work has lived on branches like `claude/resume-strategy-planning-06kMr`. Main was updated 2026-05-19 with MCP documentation. Check `git log` in any fresh session.
</project_architecture>

<standing_context_overlay>
- The Signal Pipeline is **Project A** — long-running, internal, iterative. Project B (Hub) is a parallel Framer brochure sprint, thin coupling, separate brief.
- This project is positioned as part of Alex's broader move toward a Clay-tier full-stack GTM engineer role. Frame work product accordingly when it intersects with portfolio/positioning concerns.
- Companion repo for the shipped events pipeline: `AlexYedi/Empire_State_Events_Pipeline_Take_3`. Decisions about shared data plane (Notion DBs, HubSpot) should be checked against that repo's CLAUDE.md before committing here.
- `eval-harness` is a sibling active project. Phase 1 eval decisions for Signal Pipeline must coordinate with what eval-harness is already doing.
</standing_context_overlay>
