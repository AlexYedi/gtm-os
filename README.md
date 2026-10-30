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

## State (2026-10-30)

Phase 1 shipped and consolidated onto the canonical Empire MI graph (`oicikjyzmxqfomrrqkvf`, read over REST). The old `signal` spine is retired — paused, cold-exported, final delete pending (YED-135) — and is **not a foundation for new work**. Per the 2026-10-30 three-track plan, gtm-os is **Horizon 2** (skills and proof for quota-carrying commercial roles) while **Empire runs first through year-end** (Dec 12 MI-graph go/no-go; Jan 1 2027 offer north star). Near term is opportunistic only: G-04 public-repo truth pass, University/cockpit slices. Next build window is **Q1 2027** — the GTM flagship replanned onto honest dates, then **Capstone 2 ships whole by 2027-03-31**. The re-sequenced M4–M6 plan lives in [`docs/THE_PLAN.md`](docs/THE_PLAN.md) — **DRAFT pending Alex's sign-off**. Open work lives in the EMPIRE-STATE and GTM-OS Linear teams; GTM specs are indexed in `Empire_State_Events_Pipeline_Take_3` → `docs/specs/README.md`.

## Related

- **`gtm-os-hub`** — the live dashboard-as-portfolio (its own repo, its own session). Reads gtm-os data over APIs only; no shared code.
- **`Empire_State_Events_Pipeline_Take_3`** — the shipped events pipeline (first completed module). Its `CLAUDE.md` holds the Notion DB schemas + HubSpot conventions.

## Stack notes

- **Supabase** is reached over the REST data API with per-project `sb_secret_` keys — **not** via MCP (retired to avoid cross-account token bleed). See `MCP_SETUP.md`.
- No secrets in source — `.env` / platform UI only.
