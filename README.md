# gtm-os — Signal Pipeline

**Private repo.** An always-on GTM **signal layer** that decouples content + outreach from IRL events, and produces production-grade data-foundation and data-modeling portfolio assets along the way. The shipped Empire State events pipeline is its first completed module.

Part of a broader move from "NYC AI events content creator" → **Forward Deployed GTM Engineer** candidate with a defensible portfolio.

## Start here

| Doc | What it is |
|---|---|
| [`docs/THE_PLAN.md`](docs/THE_PLAN.md) | Master strategy doc + current-state snapshot. **Read its "Current State" block first.** (De-time-boxed 2026-06-27 — hours/cadence are historical.) |
| [`Phase_1/architecture.md`](Phase_1/architecture.md) | The real, signed-off Phase 1 architecture (V2). |
| [`supabase/schema.md`](supabase/schema.md) | Deployed 11-table `signal` spine reference (grain, consumers, dedup). |
| [`CLAUDE.md`](CLAUDE.md) | Project instructions, locked decisions, guardrails. Canonical for AI sessions. |
| [`SESSION_BOOTSTRAP.md`](SESSION_BOOTSTRAP.md) | Paste-in bootstrap for a fresh session. |
| [`Phase_0/`](Phase_0/) | Completed Phase 0 exploration corpus (inventory, hygiene spec, dedup audit, signal seed list, R1 writeup draft). |

## State (2026-07-11)

Phase 0 complete · Phase 1 architecture locked (YED-44) · Supabase `signal` spine scaffolded, 11 tables / 0 rows (YED-45). **Next:** first signal ingestion into the spine (YED-56). Open work lives in the Linear project *Full-Stack GTM Roadmap (24-week half)*.

## Related

- **`gtm-os-hub`** — the live dashboard-as-portfolio (its own repo, its own session). Reads gtm-os data over APIs only; no shared code.
- **`Empire_State_Events_Pipeline_Take_3`** — the shipped events pipeline (first completed module). Its `CLAUDE.md` holds the Notion DB schemas + HubSpot conventions.

## Stack notes

- **Supabase** is reached over the REST data API with per-project `sb_secret_` keys — **not** via MCP (retired to avoid cross-account token bleed). See `MCP_SETUP.md`.
- No secrets in source — `.env` / platform UI only.
