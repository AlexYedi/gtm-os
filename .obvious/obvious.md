# gtm-os — Agent Guidance

**Repo:** `AlexYedi/gtm-os` — Signal Pipeline + planning workspace. An always-on GTM signal layer; the shipped Empire State events pipeline is its first completed module. Heavily documentation-driven: strategy docs, phase corpora, Claude skills, and small TypeScript tooling.

## Stack

- **Runtime:** Bun 1.2.22 (pinned via `packageManager`; sandbox has 1.3.14 — compatible), Node 20 for `python3`-served static assets
- **Monorepo:** npm-workspaces-style (`apps/*`) orchestrated by **Turborepo** (`turbo.json`)
- **Lint:** ESLint flat config (`eslint.config.js`, `@hrcd/eslint-config`)
- **Data plane:** Supabase (REST API + `sb_secret_` keys — never MCP). The `signal` spine is RETIRED and DELETED (2026-08-20, YED-135); do not build against it
- **App:** `apps/plan-tracker` — single static HTML file (Tailwind CDN + Dexie via UNPKG), no build step

## Commands

```bash
bun install                                   # install deps (bun.lock is source of truth)
bun run dev                                   # turbo run dev — no packages define a dev task; see Local dev below
bun run lint / lint:fix                       # turbo tasks — currently 0 tasks execute
bun run typecheck                             # turbo task — currently 0 tasks execute
bun run test                                  # turbo task — currently 0 tasks execute
python3 -m http.server 8080 -d apps/plan-tracker   # serve the plan-tracker app (port 8080)
bun run scripts/ingest-events.ts <fixture.json>    # pipeline ingestion (needs Supabase spine env — retired)
bun run scripts/ingest-events.ts --notion          # live Notion-API ingestion (needs NOTION_GTM_OS_SIGNAL_INGESTION_TOKEN + SUPABASE_SPINE_*)
```

## Local dev

The only locally runnable app is **`apps/plan-tracker`** — a static single-page tracker (9 domains, milestones M1–M6, issues YED-43 → YED-64, IndexedDB persistence via Dexie):

```bash
python3 -m http.server 8080 -d apps/plan-tracker
# open http://localhost:8080
```

Any static server works; there is no build step and no required env vars for the app itself. The pipeline scripts in `lib/` + `scripts/` require the retired Supabase spine credentials (`SUPABASE_SPINE_URL`, `SUPABASE_SPINE_SERVICE_KEY`) — see `.env.example` for the full env var map. `.env` is never committed.

## Codebase map

See [`codebase-map.md`](codebase-map.md) for the folder-level table.

## Local verification (validated 2026-10-30)

1. `bun install` — 188 packages installed cleanly (pre-installed `node_modules` was root-owned/read-only; removed with `sudo` and reinstalled).
2. Serve `apps/plan-tracker` on port 8080 — HTTP 200, correct title, issue data present.
3. Headless Chromium (playwright-core + chromium_headless_shell): page renders 26 YED issue references, **0 console/page errors**.
4. **Primary flow exercised end-to-end:** clicked the status toggle for YED-43 → IndexedDB `gtm_plan_tracker.states` written: `{issueId: "YED-43", status: "in_progress", updatedAt: "2026-10-30T15:21:45.001Z"}`. Screenshot captured.
5. Pre-existing issues recorded honestly (NOT introduced by onboarding, not fixed here):
   - `eslint .` reports ~8.3k pre-existing errors (mostly under `.claude/skills/` scripts).
   - `tsc --noEmit` fails: `@types/node` is missing from `tsconfig.json` types.
   - `turbo run lint/typecheck/test` executes 0 tasks (no package defines them).

## Local Verification Summary

- **dev_stack_healthy:** true
- **App served:** plan-tracker on port 8080 (static server, HTTP 200)
- **Primary flow evidence:** status toggle → IndexedDB write verified in headless Chromium; screenshots at `/tmp/pt-verify/tracker.png`, `/tmp/pt-verify/tracker-after-toggle.png`
- **Console errors:** 0
- **Lint/typecheck/tests:** pre-existing failures documented above; turbo tasks are no-ops
- **Snapshot:** `ilrg3q98gwc153adfww5:default` at 2026-10-30T15:21:51.735Z

## Guardrails (from CLAUDE.md — canonical)

- Supabase is reached over REST with per-project `sb_secret_` keys — **never** via MCP.
- No secrets in source — `.env` / platform UI only.
- Do not restart the events pipeline; do not build new work on the retired signal spine (`abkvgihlbwfloentugtd`).
- No fabricated numbers — report honestly when data is missing.

## Work queue and rules

- **Rules:** `AGENTS.md`, plus the `gtm-os-guardrails` skill (its invariants load on every turn). **This repo is public.**
- **Specs:** `docs/specs/gtm/` (G-04). The cross-repo index is in `AlexYedi/Empire_State_Events_Pipeline_Take_3`, `docs/specs/README.md`.
