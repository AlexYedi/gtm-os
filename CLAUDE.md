@~/Documents/GitHub/alex-agents-skills/Me/canonical-claude-md.md

<project_architecture>
## Signal Pipeline (gtm-os) — Project A

### Purpose
Build an always-on signal layer that decouples content + outreach from IRL events, increases volume of high-quality specific material, and produces rung-1 (data foundation) + rung-2 (data modeling) portfolio assets along the way. The existing Empire State events pipeline is the **first completed module**, not something being rebuilt.

The arc: move from "NYC AI events content creator" → "Clay-tier full-stack GTM engineer candidate with a defensible portfolio."

### Status (as of 2026-05-20)
**Full-Stack GTM Roadmap kickoff 2026-05-25.** Roadmap subsumes Signal Pipeline Phase 0/1. Master OS is `docs/THE_PLAN.md`. Two consecutive 12-week sprints toward Forward Deployed GTME readiness. Anchor 1 ships W12 (2026-08-17), Anchor 2 ships W24 (2026-11-09). Open work tracked in Linear project [Full-Stack GTM Roadmap (24-week half)](https://linear.app/yedibalian/project/full-stack-gtm-roadmap-24-week-half-b26daecaf649) — 6 monthly milestones (M1–M6), 22 issues (YED-43 → YED-64).

### Authoritative project docs (read on demand)
- **`docs/THE_PLAN.md`** — START HERE. Master operating system for the 24-week half: locked inputs, macro plan, weekly rhythm, domain benchmark checklist, plugin assignments, monthly review ritual, risk register, Stage 1–5 funnel mapping, Retros append section.
- **`docs/references/The-Full-Stack-GTM-Roadmap.pdf`** (V1.1) — the source thinking under THE_PLAN.md. Nine domains, depth targets, three-rung maturity model, 8-stage job-hunt funnel, confidence assessment.
- **`PROJECT_BRIEF.md`** — Signal Pipeline brief (Phase 0/1). Subsumed by THE_PLAN.md but kept for historical record of the architectural decisions that fed in.
- **`SESSION_BOOTSTRAP.md`** — paste-in bootstrap for a fresh session. Update "Current task" section as work shifts.
- **`Phase_0/README.md`** — Phase 0 overview + execution order. Closing in W1–2 of the new plan.
- **`MCP_SETUP.md` / `MCP_FALLBACKS.md`** — MCP server install + verification ladder.
- **Companion repo** (`AlexYedi/Empire_State_Events_Pipeline_Take_3`) — events pipeline canonical, shared data plane. Read its `CLAUDE.md` for Notion DB schemas + HubSpot conventions.

### Locked decisions — do NOT relitigate without an explicit flag
| Decision | Value |
|---|---|
| Project shape | Signal Pipeline (long-running) + **Hub = its own repo `AlexYedi/gtm-os-hub`** (live dashboard-as-portfolio; cockpit + public two-view). Coordinates via APIs only, no shared code; supersedes the Framer brochure (amended 2026-06-13). Develop the Hub in its own session. |
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
| **Target role archetype** | **Forward Deployed GTME** — most dynamic + hardest path (locked 2026-05-20). |
| **Weekly hour budget** | ~~**6–10 hrs/wk** (sizing at 8). Forces 24-week half cadence, not single 12-week.~~ **AMENDED 2026-06-27 — de-time-boxed.** No prescriptive hour/week or fixed-cadence constraint. Build freely; **measure** actual time-on-task and forecast remaining effort from real velocity (mechanism: GTM University in `gtm-os-hub`). The long-term plan is an *output* of measured data. THE_PLAN.md W12/W24 anchors are historical targets, not binding. Domain selection + capstones below still hold. |
| **Own domains (4)** | D1 Commercial · D2 GTM Systems · D3 GTM Engineering · D5 AI/Agent. Forced by FDGTME archetype. |
| **Do domains (4)** | D4 Data · D6 PMM · D7 CS · D9 Writing (practiced at Own intensity for D9). |
| **Recognize** | D8 Leadership & Org Design. Two books on the side, no benchmarks. |
| **D3 capstone framing** | Capstone 1 deeply shipped (Phase 1 Signal Pipeline); Capstone 2 ships (Outbound Engine); Capstone 3 scope-only (build deferred). |

### Project-specific guardrails
- **Do not restart the events pipeline.** It's shipped. It's a module of Signal Pipeline.
- **Do not conflate the events pipeline with the job-hunt funnel.** They share Stages 1 and 4; different artifacts.
- **Do not ship a sixth content skill before the R2 measurement dashboard exists.** (Clay red-flag #4.)
- **No fabricated numbers.** If an MCP query fails or data is missing, report honestly. Never substitute estimates for measured values.
- **Respect the active-project list.** gtm-os, eval-harness, scaffold-skill are active. Flag overlap explicitly when it appears.

### Required MCP connections
- **Notion** (read/write — hosted at `https://mcp.notion.com/mcp` via repo's `.mcp.json`)
- **HubSpot** (read/write — Claude.ai account connector only; `mcp__claude_ai_HubSpot__*`). Retired from repo's `.mcp.json` on 2026-05-21 (commit `5d32e68`) to the Layer 2 connector; no `.env` token needed. See `MCP_SETUP.md`.
- **Linear, PostHog, Granola, Vercel, Gmail, Google Calendar, n8n** — enabled via `.claude/settings.local.json`
- **Supabase — NOT via MCP.** Reached over the REST data API with per-project `sb_secret_…` keys (`SUPABASE_SPINE_*` / `SUPABASE_GTM_OS_*` in `.env`). The MCP was retired to avoid token bleed across the separate Supabase accounts now in use (Empire State has its own account). See `MCP_SETUP.md` §4.

If Notion or HubSpot is not connected for a Phase 0 inventory task, STOP and report. Setup instructions are in `MCP_SETUP.md`.

### Active branch context
Phase 0 work has lived on branches like `claude/resume-strategy-planning-06kMr`. Main was updated 2026-05-20 with `docs/THE_PLAN.md` and the roadmap-kickoff CLAUDE.md amendments. Linear issue branches follow the `alex/yed-NN-...` convention for the new Roadmap project (YED-43 → YED-64). Check `git log` in any fresh session.
</project_architecture>

<standing_context_overlay>
- The Signal Pipeline is **Project A** — long-running, internal, iterative. The **Hub** is now its own repo (`AlexYedi/gtm-os-hub`) — a live dashboard-as-portfolio (cockpit + public *The Work, Live* → *Living System Map*). It reads gtm-os data over external APIs only (no shared code), supersedes the earlier "Project B / Framer brochure" framing (amended 2026-06-13), and is developed in its own session.
- This project is positioned as part of Alex's broader move toward a Clay-tier full-stack GTM engineer role. Frame work product accordingly when it intersects with portfolio/positioning concerns.
- Companion repo for the shipped events pipeline: `AlexYedi/Empire_State_Events_Pipeline_Take_3`. Decisions about shared data plane (Notion DBs, HubSpot) should be checked against that repo's CLAUDE.md before committing here.
- `eval-harness` is a sibling active project. Phase 1 eval decisions for Signal Pipeline must coordinate with what eval-harness is already doing.
</standing_context_overlay>
