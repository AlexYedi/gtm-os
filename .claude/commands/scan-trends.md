---
description: "External Signal Layer — scan what's rising in AI/tech from legitimate non-LinkedIn sources (HackerNews, HuggingFace, curated newsletters), rank by recency-decayed cross-source score, and log approved topics to the Notion Topics DB. Phase 1: Notion-only, human-in-the-loop. No scraping."
argument-hint: "[optional: lookback window + focus, e.g. 'last 3 days, agents and evals']"
---

# /scan-trends — Trend Radar (Phase 1)

Run the **trend-radar** methodology to sense what's rising in AI/tech and log the winners to Notion. This is the manual trigger; the methodology lives in `.claude/skills/trend-radar/SKILL.md`.

**Input (all optional):** anything after the command sets the lookback window and/or focus, e.g. `/scan-trends last 3 days, agents and evals`. With no args: 7-day window, broad AI/tech, Top-10.

## Trigger

Runs when Alex:
- types `/scan-trends [args]`
- says "what's trending", "run trend radar", "scan AI trends this week"

## Orchestration shape

This is a single-thread skill run (no multi-agent fan-out needed in Phase 1). Execute `.claude/skills/trend-radar/SKILL.md` end-to-end in this conversation:

1. **Parse args** → lookback window (default 7d), focus (default broad), Top-N (default 10).
2. **Step 1 — Pull (parallel):** Algolia HN Search (`WebFetch`), HuggingFace papers + models (HF MCP), labeled newsletters (Gmail MCP `search_threads` → `get_thread`). Continue past any single source failure; flag gaps.
3. **Step 2 — Normalize** topics to canonical slugs (`alex:signal-taxonomy`).
4. **Step 3 — Score & rank**: `source_weight × recency_decay (7-day half-life) × normalized_velocity`, then `× cross_source_bonus`. (`alex:signal-scoring`.)
5. **Step 4 — Present ranked digest. STOP for approval.** Do not write to Notion before Alex picks topics (all / numbers / none).
6. **Step 5 — Write approved topics**: dedup via `notion-search` scoped to the Topics data source (`collection://d61ce9df-94b3-4637-aa09-d77e09ab3a74`) + `notion-fetch` to confirm — NOT `notion-query-data-sources` (plan-gated, verified 2026-06-24); existing → append a dated note to `Current Events` + set `Last Updated`; net-new → confirm, then create. No schema mutation (no `Trend Velocity` property in Phase 1).
7. **Step 6 — Close out** + offer the `signal-to-post` bridge.

## Guardrails (from `gtm-os/CLAUDE.md`)

- Public sources only — no LinkedIn/X scraping.
- Human-in-the-loop: the digest is presented for approval before any write.
- Search Notion before creating (no native dedup). Live schema is authoritative — `notion-fetch` if anything drifts.
- No fabricated numbers: report source gaps honestly; never estimate a missing metric.

## What comes next (chain)

| Want to... | Do |
|---|---|
| Turn a top trend into a LinkedIn post | `signal-to-post` (Empire State; Phase 2) — until built, draft inline via `pre-event-content` conventions |
| Add who's-trending / social listening | `/scan-voices` (Phase 1b) |
| Track relevant roles | `/scan-roles` (Phase 1b) |
| Weekly composite of trends + voices + roles | `/signal-digest` (Phase 1b) |

## Ground truth

- Methodology: `.claude/skills/trend-radar/SKILL.md`
- Scoring / taxonomy: `alex:signal-scoring`, `alex:signal-taxonomy`
- Notion schema: Empire State `.claude/references/notion-schema.md`
- Why this is legitimate-only + the deferral it fulfills: `gtm-os/CLAUDE.md` (Locked decisions: Ethics, Watchlist) + `gtm-os/Phase_0/signal_seed_list.md`
