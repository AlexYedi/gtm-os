# apps/plan-tracker

**Interactive front-end for the 24-week Full-Stack GTM Roadmap plan.**

Single static HTML file — no build step. Renders the 9 domains, 6 monthly milestones (M1–M6), and 22 issues (YED-43 → YED-64) from `docs/THE_PLAN.md`. Per-issue: status toggle, file uploads, autosaved notes. All data is stored locally in your browser via IndexedDB.

## Run locally

```bash
# From repo root, any one of these works:
open apps/plan-tracker/index.html
# or
python3 -m http.server 8080 -d apps/plan-tracker
# then visit http://localhost:8080
```

Or just double-click `index.html` in Finder.

## Deploy to Vercel (static)

```bash
# From repo root:
vercel deploy apps/plan-tracker --prod
```

Since the page uses Tailwind Play CDN + Dexie via UNPKG, no build pipeline is needed. Vercel will serve `index.html` as a static asset.

## Data model (IndexedDB)

Database: `gtm_plan_tracker`. Three object stores:

| Store | Key | Fields |
|---|---|---|
| `states` | `issueId` | `status` (`backlog` / `in_progress` / `done`), `updatedAt` |
| `notes` | `issueId` | `text`, `updatedAt` |
| `uploads` | auto `localId` | `issueId`, `name`, `type`, `size`, `blob` (Blob), `createdAt` |

## Export / Import / Clear

- **Export JSON** downloads a portable backup including base64-encoded file blobs.
- **Import** replaces all current data with the contents of an exported JSON file.
- **Clear** wipes everything (two-step confirm).

**Export regularly.** IndexedDB lives in this browser only — clearing site data, switching browsers, or device loss will lose state.

## Limits

- 50 MB per file (IndexedDB performance cliff; alerted on upload).
- Total IndexedDB quota depends on browser + free disk; modern browsers allow ~500MB+ per origin.
- Single-user. No sync.

## Migration path to Supabase (V2)

Per `Phase_1/architecture.md` §9 (Hub / front-end coupling), the V2 version of this tracker will read from the Supabase `v_public_*` views via either the anon key + RLS or a thin Next.js API route in `apps/dashboard`. Migration happens W9+ once the Phase 1 spine is up and the dashboard exists. Until then, V1 IndexedDB is the source of truth for tracker state.

## Source data

This file's `DOMAINS`, `FUNNEL`, `MILESTONES`, and `ISSUES` constants mirror:

- `docs/THE_PLAN.md` (master OS) — 28-item benchmark checklist + 24-week macro plan
- Linear project [Full-Stack GTM Roadmap (24-week half)](https://linear.app/yedibalian/project/full-stack-gtm-roadmap-24-week-half-b26daecaf649) — issues YED-43 → YED-64

When THE_PLAN.md or Linear issues drift, update the constants at the top of the `<script>` block in `index.html` to match. There is no automatic sync — that's V2 work.
