---
name: local-dev
description: How to get gtm-os running locally, validated during onboarding (2026-10-30)
---

# local-dev

## What runs locally

The only locally runnable app is `apps/plan-tracker` — a single static HTML file
(Tailwind CDN + Dexie via UNPKG, IndexedDB persistence). No build step, no required
env vars, no database to start.

```bash
bun install                                      # deps for lint/turbo tooling
python3 -m http.server 8080 -d apps/plan-tracker # serve; open http://localhost:8080
```

Any static server works. Port 8080 matches `apps/plan-tracker/README.md`.

## What does NOT run locally

- `bun run dev` / `lint` / `typecheck` / `test` are turbo tasks, but no package
  defines them — they execute 0 tasks and are no-ops.
- The pipeline (`lib/` + `scripts/ingest-events.ts`) needs the Supabase **signal
  spine**, which is RETIRED/paused (YED-135, see CLAUDE.md). Do not resurrect it
  just to run the app. Credentials it would need: `SUPABASE_SPINE_URL`,
  `SUPABASE_SPINE_SERVICE_KEY`, and for `--notion` mode
  `NOTION_GTM_OS_SIGNAL_INGESTION_TOKEN`. See `.env.example` for the full map.
- `tsc --noEmit` currently fails: `@types/node` missing from `tsconfig.json`.
- `eslint .` has ~8.3k pre-existing errors, mostly in `.claude/skills/*/scripts`.

## Onboarding validation record (2026-10-30)

1. Pre-installed `node_modules` was **root-owned and read-only** — `bun install`
   failed with EEXIST link errors. Fix: `sudo rm -rf node_modules && bun install`
   (188 packages, ~0.5s).
2. Served plan-tracker with `python3 -m http.server 8080 -d apps/plan-tracker` —
   HTTP 200, title "Full-Stack GTM Roadmap — Plan Tracker".
3. Headless Chromium (playwright-core@1.49.1 + `chromium_headless_shell`, installed
   to `~/.cache/ms-playwright`, system libs via apt) loaded the page: 26 YED issue
   references rendered, 0 console/page errors.
4. **Primary flow verified end-to-end:** clicked the status toggle for YED-43 →
   IndexedDB `gtm_plan_tracker` (stores: `states`, `notes`, `uploads`) received
   `{issueId: "YED-43", status: "in_progress", updatedAt: "2026-10-30T15:21:45.001Z"}`.
   Screenshots: `/tmp/pt-verify/tracker.png`, `/tmp/pt-verify/tracker-after-toggle.png`
   (ephemeral — re-run the flow to regenerate).
5. `dev_stack_healthy: true`.

## Gotchas

- Status-toggle buttons exist in the DOM before being visible; a Playwright
  `click()` on the first match times out. Dispatch via JS (`el.click()`) or target
  a visible row first.
- If `bun install` reports `Failed to link …: EEXIST`, the `node_modules` tree was
  laid down by root — remove it with `sudo` and reinstall.
