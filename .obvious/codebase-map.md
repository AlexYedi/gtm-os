# gtm-os — Codebase Map

Depth cap 2. Counts are git-tracked files.

| Path | Files | What it is |
|---|---|---|
| `.claude/` | 240 | Claude Code project config: agents, commands, proposals, and ~40 `skills/` (GTM/Clay playbooks with TS helper scripts), `settings.json` |
| `.config/` | 1 | `automd.ts` — doc automation config |
| `apps/` | 2 | `plan-tracker/` — the one runnable app: single static `index.html` (Tailwind CDN + Dexie/IndexedDB) + its README |
| `docs/` | 8 | `THE_PLAN.md` (master strategy), Vercel Workflow SDK best practices, build journal, career reference |
| `lib/` | 7 | Pipeline TypeScript: `reader.ts` (fixture/Notion readers), `ingest.ts`, `derive.ts`, `normalize.ts`, `resolve.ts`, `spine.ts` (Supabase REST writes) |
| `patches/` | 1 | `@nuxthub/core` patch (historical; no Nuxt app in repo) |
| `scripts/` | 10 | `ingest-events.ts` (CLI entry: `bun run ingest`), `topic_intelligence/` (Python/SQL topic-cluster tooling) |
| `supabase/` | 22 | `config.toml`, `schema.md` (11-table signal spine reference), `migrations/` (7 SQL), `archive/` (spine decommission export) |
| `Phase_0/` | 14 | Completed exploration corpus: inventory protocol, hygiene spec, dedup audit, signal seed list, PDFs |
| `Phase_1/` | 4 | Locked Phase 1 architecture (V2), ingestion MVP plan, topic-intelligence spec |

Root files worth knowing: `CLAUDE.md` (canonical project instructions + locked decisions), `README.md`, `SESSION_BOOTSTRAP.md`, `MCP_SETUP.md` / `MCP_FALLBACKS.md`, `PROJECT_BRIEF.md`, `package.json` + `bun.lock` (Bun + Turbo), `turbo.json`, `eslint.config.js`, `tsconfig.json`, `.env.example` (full env var map), `.mcp.json`.
