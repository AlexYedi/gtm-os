# MCP Setup — gtm-os signal-plane

The signal-plane is the set of MCP (Model Context Protocol) servers that
Claude reads from when running gtm-os work. Eleven servers cover the full
prospecting/intel surface area.

## Architecture: two layers

MCP servers reach Claude through one of two paths:

| Layer | Where it lives | When to use |
|---|---|---|
| **Desktop connector** | Claude Code app → Settings → Connectors. OAuth handshake, token stored encrypted in `~/Library/Application Support/Claude/Local Storage` (LevelDB). | Default for hosted MCPs that use OAuth (Notion, Linear, Vercel, Google, etc.). One-click setup, but **not version-controlled** and **not portable** across machines. |
| **Project `.mcp.json`** | `gtm-os/.mcp.json`. Plain JSON, env-var substitution via `${VAR}`. Loaded at Claude Code session start. | When a server needs explicit credentials (Bearer JWT, API key), a custom URL, or to override a flaky desktop connector. Version-controlled, portable. |

A server can exist in **both** layers simultaneously — when that happens
Claude registers two parallel connections. To avoid duplicates, disable
the desktop connector for any server you've moved into `.mcp.json`.

## The 11 servers

| # | Server | Layer | Auth | Purpose |
|---|---|---|---|---|
| 1 | notion | desktop | OAuth | Events DB, research briefs, content drafts |
| 2 | hubspot | desktop | OAuth → Private App token | CRM (contacts, companies, deals) |
| 3 | linear | **project** | OAuth | Issue tracking. Forced to streamable HTTP because the desktop SSE transport flaked. |
| 4 | posthog | desktop | OAuth | Product analytics, funnels |
| 5 | clay | desktop | OAuth | Company/contact enrichment |
| 6 | n8n | **project** | Bearer JWT (`N8N_MCP_TOKEN`) | Workflow orchestration on yedimaing.app.n8n.cloud |
| 7 | supabase | desktop | OAuth | Postgres for gtm-os data plane |
| 8 | granola | desktop | OAuth | Meeting transcripts |
| 9 | vercel | desktop | OAuth | Deployments, project state |
| 10 | google-calendar | desktop | OAuth (Google) | Calendar events |
| 11 | gmail | desktop | OAuth (Google) | Inbox search |

## Bring-up waves

When setting up a fresh machine, bring servers up in waves. Don't
parallelize — each wave has prerequisites the next depends on.

### Wave 0 — repo hygiene
1. Clone the repo.
2. `cp .env.example .env` and fill in the secrets. `chmod 600 .env`.
3. Confirm `.env` is gitignored (`grep -E "^\\.env$" .gitignore`).

### Wave 1 — project MCPs (no OAuth, fastest to verify)
1. Restart Claude Code so it reads `.mcp.json` at session start.
2. Run `/mcp` in Claude Code. You should see `linear` and `n8n` listed.
3. Linear will prompt for OAuth on first use — complete the browser flow.
4. n8n auths via the Bearer header from `${N8N_MCP_TOKEN}` — no prompt.

### Wave 2 — desktop connectors (OAuth-only)
For each of: notion, hubspot, posthog, clay, supabase, granola, vercel,
google-calendar, gmail:
1. Open Claude Code → Settings → Connectors → Add MCP.
2. Pick the connector from the directory. Complete OAuth.
3. Confirm tools appear in `/mcp`.

### Wave 3 — verification
Run the canonical read-only probe (one query per server). The probe lives
in this doc as a reference; it is the same set used in
`MCP_FALLBACKS.md`'s "verification queries" section. If any probe fails,
consult the matching fallback in `MCP_FALLBACKS.md`.

## Failure-mode triage

When a server is unreachable, classify before fixing:

- **Missing env var** — `.env` not loaded or key absent. Diagnostic:
  `echo $N8N_MCP_TOKEN` in the shell that launched Claude Code. Fix:
  populate `.env`, restart Claude Code (env is read at process start).
- **OAuth handshake didn't complete** — `mcp-needs-auth-cache.json`
  contains the server but tools never appear. Fix: run `/mcp` and click
  through the auth prompt.
- **Hosted-URL incompatibility** — server reachable but tool calls return
  "connector's server isn't responding". Common with SSE transports that
  drop on 5xx. Fix: switch to streamable HTTP via `.mcp.json` (see
  `MCP_FALLBACKS.md` for shapes).
- **Stale token / rotated cred** — Bearer header rejected with 401/403.
  Fix: regenerate the token in the upstream service, update `.env`,
  restart Claude Code.

## Why this architecture

Desktop connectors are convenient but fragile: they're machine-bound,
opaque (encrypted LevelDB), and can drift silently. Project `.mcp.json`
trades convenience for reproducibility — every credential and URL is
explicit, version-controlled, and portable. We use desktop connectors
when OAuth is the only option (Google, Granola) or when the connector
just works; we use `.mcp.json` when something has broken or needs a
custom shape (n8n's self-hosted instance, Linear's transport switch).
