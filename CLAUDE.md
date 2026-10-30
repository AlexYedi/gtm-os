@~/Documents/GitHub/alex-agents-skills/Me/canonical-claude-md.md

<project_architecture>
## Signal Pipeline (gtm-os)

### Purpose
An always-on signal layer that decouples content and outreach from IRL events and produces data-foundation and data-modeling portfolio assets along the way. The Empire State events pipeline is its **first completed module**, not something to rebuild.

**Mission and goals live in one place:** the Notion Empire State Roadmap (§1 north star, §2 pillars). Don't restate them here. Empire State runs the current job search. **gtm-os is Horizon 2:** the skills and proof that grow Alex past the roles he's qualified for today (FDGTME-style work is the *next* role's ground). Target roles, hours and cadence come from the roadmap; there is no hour budget here (measure time-on-task instead, via GTM University in `gtm-os-hub`).

### Where things live
- **Open work, decisions, follow-ups:** Linear, team GTM-OS (`GTM-n`); cross-repo work in EMPIRE-STATE (`YED-n`).
- **`docs/THE_PLAN.md`:** master strategy and "Current State" snapshot (its week anchors are historical).
- **`Phase_1/architecture.md`:** the signed-off Phase 1 architecture.
- **`Phase_0/The-Full-Stack-GTM-Roadmap.pdf`:** source thinking (nine domains, three-rung maturity model).
- **`MCP_SETUP.md` / `MCP_FALLBACKS.md`:** connector and Supabase-access ladder.
- **Companion repo** `AlexYedi/Empire_State_Events_Pipeline_Take_3`: events pipeline, shared data plane, Notion and HubSpot schemas, the MI graph ADRs (`docs/adr/`).
- **Hub:** its own repo, `AlexYedi/gtm-os-hub` (live dashboard-as-portfolio). It reads gtm-os data over external APIs only, no shared code; develop it in its own session.

### Data
The MI graph lives on the Empire prod DB (`oicikjyzmxqfomrrqkvf`), read over REST, never the Supabase MCP (different account). The old signal spine (`abkvgihlbwfloentugtd`) is retired and was **deleted** on 2026-08-20 after a cold export (`supabase/archive/spine-decommission-2026-08-20/`, now the only copy; YED-135); don't build on it. Supabase is on the free tier today; an upgrade is a spend decision for Alex.

### Standing decisions
| Decision | Value |
|---|---|
| Enterprise-grade, proportionally | Data contracts, schema rigor, idempotency, secrets hygiene, real logging, evals on LLM parts. Not Kubernetes-for-one-user. |
| Build order (guidance) | Foundation → Modeling → Activation is the default sequence; skip ahead when a build has a reason. |
| Distribution | LinkedIn primary; X and Hub long reads in scope; full channel plan in the Empire repo, `docs/spec-distribution-channels.md`. Every channel is human-approved before publish. |
| Budget | Subscriptions by default; name the best tool or paid API with its trade-offs; no spend without Alex. |
| Workflow runtime | Open: pick when a build needs a durable runtime. |
| Hygiene workstream | First-class writeup with its own living document and changelog. |
| Ethics | No LinkedIn or X scraping. Public APIs, RSS, official endpoints and Alex's own data exports only. |
| Domains | Own: D1 Commercial · D2 GTM Systems · D3 GTM Engineering · D5 AI/Agent. Do: D4 Data · D6 PMM · D7 CS · D9 Writing. Recognize: D8 Leadership. Build merits first; the domain fit is the tiebreaker. |

### Guardrails
- **No fabricated numbers.** If a query fails or data is missing, say so; never substitute estimates for measured values.
- **Don't conflate the events pipeline with the job-hunt funnel.** They share stages 1 and 4 but produce different artifacts.
- **Shared data plane:** check Notion and HubSpot changes against the Empire CLAUDE.md before committing here.

### Connections
- **Notion:** read/write via the repo's `.mcp.json` (`https://mcp.notion.com/mcp`).
- **HubSpot:** the Claude.ai account connector (`mcp__claude_ai_HubSpot__*`); no `.env` token.
- **Linear, PostHog, Granola, Vercel, Gmail, Google Calendar, n8n:** enabled in `.claude/settings.local.json`.
- **Supabase:** REST with per-project `sb_secret_…` keys in `.env` (`MCP_SETUP.md` §4), not the MCP.
</project_architecture>
