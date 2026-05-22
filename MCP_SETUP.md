# MCP Setup — gtm-os signal plane

**Purpose:** wire all Tier 1 GTM data + ops servers into Claude Code CLI for the gtm-os repo so every session in this directory boots with the full signal plane available.

The signal plane reaches Claude Code via **two layers**:

- **Layer 1 — Project `.mcp.json` (7 servers):** Notion, Linear, PostHog, Granola, Supabase, Vercel, n8n. Started as local subprocesses when Claude Code launches in this repo. Tools appear unprefixed (`mcp__notion__*`, etc.).
- **Layer 2 — Claude.ai-account connector bridge:** Claude Code CLI inherits the connectors authorized on your Claude.ai account (tracked in `~/.claude.json` → `claudeAiMcpEverConnected`). Tools appear under `mcp__claude_ai_<Service>__*`. **HubSpot, Gmail, and Google Calendar are Layer-2 only** — see the "Why X moved to Layer 2" subsections below.

For most Layer-1 servers, a parallel Layer-2 connector also exists. Prefer the Layer-1 unprefixed tool when both are healthy — it's the path this doc and the verification cadence probe.

**Clay is currently deferred** — see `MCP_FALLBACKS.md` §2 for context. Both attempted paths (v3 API endpoint via `.mcp.json`, desktop Connectors OAuth) failed to surface query tools. Clay is reachable manually via the web UI; revisit the MCP path after Phase 0 inventory or on a Clay product update.

## Why Gmail/Calendar moved to Layer 2 (2026-05-19)

The URLs `https://gmail.mcp.claude.com/mcp` and `https://gcal.mcp.claude.com/mcp` return **HTTP 404** when accessed via `mcp-remote`. They are internal infrastructure for the Claude.ai connector bridge, not third-party MCP endpoints. The corresponding `.mcp.json` entries were removed; use the Layer-2 tools (`mcp__claude_ai_Gmail__*`, `mcp__claude_ai_Google_Calendar__*`) instead. A self-hosted Google Workspace MCP server is documented in `MCP_FALLBACKS.md` §1 as an optional escape hatch if the Claude.ai bridge ever becomes insufficient.

## Why HubSpot moved to Layer 2 (2026-05-21)

Layer 1 (`@hubspot/mcp-server` in `.mcp.json`) was removed after Phase 0 inventory revealed two things: (1) the events pipeline in the companion repo never used Layer 1 at all — its `.mcp.json` has only Notion + Linear, and HubSpot writes have always been routed through the Claude.ai connector; (2) the `.env` token had silently corrupted into a base64-wrapped protobuf payload at some point, returning the canonical Unix-epoch 401 (`expired 20594 days ago`) on every call. The variable-name fix attempted in YED-37 did not address the value corruption, and the value corruption did not block anything in production because production was on Layer 2 the whole time. Rather than rotate a Private App token nobody actually needs, the decision was to delete Layer 1 entirely. Use `mcp__claude_ai_HubSpot__*` for all HubSpot work. The connector is OAuth'd to portal **245798280** (Standard CRM Hub, na2 region, owner ID 90413044 — same account documented in the companion repo's CLAUDE.md). Reauthorize at claude.ai → Settings → Connectors → HubSpot if the connector goes stale.

**Time budget:** ~45–60 min on a clean install. Don't try to do it all in one sitting — the verification ladder below stages it so you can stop after any rung and resume later.

**Result:** every Claude Code session in `gtm-os/` has read/write access to the full GTM stack via MCP. No paste-and-sync, no Claude.ai desktop round trips for this repo.

---

## Files involved

- `.mcp.json` — repo root, committed. Defines all 8 Layer-1 servers.
- `.env.example` — repo root, committed. Documents required env vars + scopes.
- `.env` — repo root, **gitignored**. Holds actual tokens.
- `MCP_FALLBACKS.md` — fallback / deferred-server context.
- Layer-2 connectors are configured on the Claude.ai account, not in this repo — manage them at claude.ai → Settings → Connectors.

---

## Verification ladder (recommended order)

The trick to avoiding "5 things broken at once" debugging is to add servers in waves. Each wave is a stop point — verify all servers in the wave work before moving on.

| Wave | Servers | Why grouped |
|---|---|---|
| **0** | Notion | Already proven from Empire repo migration. Re-verify after copy. |
| **1 (API key, fast)** | Linear, PostHog, n8n, Supabase | API-key auth is fastest to set up and test. Get the easy wins. |
| **2 (OAuth, hosted)** | Granola, Vercel | OAuth via mcp-remote is reliable for these vendors. |
| **3 (Layer 2)** | HubSpot, Google Calendar, Gmail | NOT in `.mcp.json`. Authorize via claude.ai → Settings → Connectors → HubSpot / Google Calendar / Gmail. After authorizing, restart Claude Code and the `mcp__claude_ai_HubSpot__*`, `mcp__claude_ai_Google_Calendar__*`, `mcp__claude_ai_Gmail__*` tools appear automatically. See "Why HubSpot/Gmail/Calendar moved to Layer 2" subsections above for rationale; `MCP_FALLBACKS.md` §1 for Google Workspace self-hosted alternative. |
| **4 (deferred)** | Clay | Currently deferred — see `MCP_FALLBACKS.md` §2. Both `.mcp.json` v3 API and desktop Connectors paths failed to surface query tools (only `authenticate`/`complete_authentication` stubs appear). Use Clay web UI manually. Revisit on Clay product update or plan-tier change. |

After each wave: run `/mcp` to confirm green status, then run a one-tool sanity query (table at the bottom of this doc) before adding the next wave.

---

## Wave 0 — Notion (already proven)

Set up in the Empire repo and pushed to gtm-os via the bootstrap kit copy.

- **Notion:** OAuth flow on first `/mcp` invocation. No token needed.

(HubSpot was originally part of Wave 0 via `@hubspot/mcp-server` in `.mcp.json`; removed 2026-05-21 — see "Why HubSpot moved to Layer 2" above. Verify HubSpot via the Wave 3 / Layer 2 path instead.)

**Verify:**
```
Run a Notion search for the Events database (data source ID
9dcbc999-b4ed-4a51-b48a-10aaf171f1ba) and return the row count.
```

If it fails, stop and fix before moving on. The Empire repo's `MCP_SETUP.md` troubleshooting table covers the common failures.

---

## Wave 1 — Linear, PostHog, n8n, Supabase

### 1. Linear (OAuth)

No token. On first `/mcp` after restart, click the auth link, complete in browser. Done.

### 2. PostHog (API key)

1. PostHog → **Settings → Personal API keys → Create personal API key**.
2. Label: `claude-code-gtm-os`.
3. Scopes (read-only is fine for v1):
   - `insight:read`
   - `dashboard:read`
   - `feature_flag:read`
   - `query:read`
   - `session_recording:read`
4. Copy the key. Paste into `.env` as `POSTHOG_API_KEY=`.

### 3. n8n (API key)

1. n8n → **Settings → n8n API → Create API key**.
2. Instance: `yedimaing.app.n8n.cloud`.
3. Paste into `.env` as `N8N_API_KEY=`.

### 4. Supabase (Personal Access Token)

1. Supabase → **Account → Access Tokens → Generate new token**.
2. Note: this is account-scoped, NOT project anon/service key. The MCP server uses this to discover and operate across projects you have access to.
3. Paste into `.env` as `SUPABASE_ACCESS_TOKEN=`.

### Restart Claude Code, run /mcp

All four new servers should show as connected. If any fails, check the env var name matches `.mcp.json` exactly (these are templated with `${VAR_NAME}` in `.mcp.json`).

### Wave 1 verification queries

```
1. Linear: list my open issues assigned to me, return titles only.
2. PostHog: return the list of projects in my account.
3. n8n: list active workflows on yedimaing.app.n8n.cloud.
4. Supabase: list my projects and return name + region for each.
```

If any return a 401/403, the token is wrong or scopes are insufficient — re-check.

---

## Wave 2 — Granola, Vercel

### 5. Granola (OAuth)

`/mcp` → click auth link → complete. Done.

### 6. Vercel (OAuth)

`/mcp` → click auth link → complete. Vercel will ask which team/scope to grant. Pick the scope that includes the projects you'll deploy gtm-os/Hub from.

### Wave 2 verification queries

```
1. Granola: search my recent meetings for "GTM" and return the 5 most recent matches.
2. Vercel: list my projects and return their production URLs.
```

---

## Wave 3 — Google Calendar, Gmail (via Layer 2)

**Updated 2026-05-19:** these are NOT in `.mcp.json`. The previously documented URLs (`gcal.mcp.claude.com/mcp`, `gmail.mcp.claude.com/mcp`) return HTTP 404 from `mcp-remote` — they're internal infrastructure for the Claude.ai connector bridge, not third-party MCP endpoints.

### Setup

1. claude.ai → **Settings → Connectors → Google Calendar → Connect**. Complete OAuth.
2. Same for **Gmail**.
3. Restart Claude Code in `gtm-os/`. The bridge picks up the new connectors automatically.
4. In a fresh session, the tools appear as `mcp__claude_ai_Google_Calendar__*` and `mcp__claude_ai_Gmail__*` (visible via ToolSearch).

No env vars, no `.mcp.json` edits, no `mcp-remote` involved.

### Wave 3 verification queries

```
1. Google Calendar: list my events for the next 7 days, return title + start time. (call mcp__claude_ai_Google_Calendar__list_events)
2. Gmail: search my inbox for messages from the last 24 hours containing "intro" and return subject + sender. (call mcp__claude_ai_Gmail__search_threads)
```

### When to consider the self-hosted fallback

If the Claude.ai bridge ever returns errors, lacks a scope you need (e.g., `gmail.modify`), or goes away, `MCP_FALLBACKS.md` §1 documents a self-hosted Google Workspace MCP server you can drop into `.mcp.json` with your own GCP OAuth client. Default to the bridge — the self-hosted path is the escape hatch.

---

## Wave 4 — Clay (DEFERRED as of 2026-05-08)

**Status: not connected.** Both attempted paths failed:

1. **`.mcp.json` v3 API endpoint** (`https://api.clay.com/v3/mcp` + `Authorization: Bearer $CLAY_API_KEY`) — likely plan-tier 403, registered zero tools.
2. **Desktop Connectors → Sales → Clay** — OAuth completes and the consent screen claims MCP scope is included, but the resulting tool surface only contains `mcp__plugin_sales_clay__authenticate` and `mcp__plugin_sales_clay__complete_authentication` stubs. No query tools. Reproduced across multiple disconnect/reconnect cycles + fresh sessions.

Most likely cause: Clay's Connectors integration is auth-stub-only at this point in time, OR query tools sit behind an undisclosed plan-tier gate. **Not fixable from our end without Clay support engagement or plan upgrade.**

### Current operational state

- **Use Clay manually via web UI** for any enrichment work.
- The signal-plane probe treats Clay as `DEFERRED — see MCP_FALLBACKS.md §2`, not as a regression.
- **Re-test trigger:** Clay product update, plan upgrade, or explicit user request ("re-test Clay"). Until one of those, do not retry.

### Re-test procedure (when triggered)

1. Open Claude desktop → **Connectors → Sales → Clay → Connect**.
2. Complete OAuth.
3. Quit Claude Code fully, relaunch from gtm-os/.
4. In the new session, ask the agent to count `mcp__plugin_sales_clay__*` tools.
   - **>2 tools** → Clay now works. Add a Wave 4 connected step here documenting the new state, remove the deferred guidance, update `verification_cadence.md` to add Clay back to the active probe set.
   - **=2 tools** → still broken. Stay in deferred state.

---

## Full final verification (after waves 0–3)

Once Layer 1 is green in `/mcp` (8 servers) and Layer 2 is authorized on claude.ai (Gmail + Calendar), run this end-to-end signal-plane sanity check:

```
For each connected MCP server, run one read-only query and confirm a non-error response.
Report results in a table: server | layer | query | status | one-line result.
Probe the 8 Layer-1 servers via unprefixed tools, and Gmail + Google Calendar via mcp__claude_ai_* tools.
Stop and flag any failures.
```

Expected steady state: 10 ✅ green (8 Layer-1 + 2 Layer-2) + Clay row marked `DEFERRED — see MCP_FALLBACKS.md §2`. That is "fully wired" until the Clay path is unblocked.

---

## Troubleshooting (cross-cutting)

| Symptom | Likely cause | Fix |
|---|---|---|
| `/mcp` shows server but "not connected" | OAuth flow didn't complete | Re-run `/mcp`, click auth link, complete in browser |
| 401/403 on first call | Token wrong, expired, or missing scopes | Re-check `.env` value; regenerate token if uncertain |
| `npx -y mcp-remote ...` hangs first run | npm cache priming | Wait 30s; subsequent runs are fast |
| Server never appears in ToolSearch | Session not restarted after `.mcp.json` change OR JSON syntax error in `.mcp.json` | Restart Claude Code; validate JSON with `jq` |
| `.env` shows in `git status` | gitignore mismatch | Confirm `.gitignore` has `.env` and `.env.*` entries |
| Hosted MCP returns "method not allowed" or 404 | URL is chat-only / Claude.ai-bridge-internal, not third-party-MCP-compatible | Use the Layer-2 `mcp__claude_ai_*` tool instead, or switch to npm-package fallback (see `MCP_FALLBACKS.md`) |
| Server appears in `/mcp` as connected but returns JSON-RPC `-32000` | Local-package crashed at startup, usually missing or misnamed env var | Run the server's `npx` command directly in a shell to see the actual error message; fix env var name in `.env` |
| ToolSearch noisy after install | Layer 1 (8 servers) + Layer 2 (~22 services) = high tool count | Use `select:<tool_name>` queries when you know the target tool |

---

## Security notes

- **Never commit `.env`.** Verify `git status` before any commit touching env-related files.
- **Token rotation:** every server above supports key rotation. Rotate on suspicion of leak — never reuse a leaked token.
- **Scope minimization:** v1 mirrors broad scopes for speed. After Phase 0 inventory, narrow scopes per server based on actual usage.
- **Hosted MCP trust model:** OAuth-based Layer-1 servers (Notion, Linear, Granola, Vercel) authenticate per Claude Code session via `mcp-remote`; tokens cached under `~/.mcp-auth/`. Layer-2 servers (Gmail, Calendar, and others on the Claude.ai bridge) authenticate per Claude.ai account; manage them at claude.ai → Settings → Connectors. Tokens for either path are not stored in `.env`. If a session leaks, re-authenticate to invalidate.
- **n8n API key is broad** — it can trigger any workflow on your instance. Treat as production credential.

---

## Related

- `.mcp.json` — config this guide describes
- `.env.example` — env template; copy to `.env` for actual values
- `MCP_FALLBACKS.md` — fallback configs for servers that don't work via hosted URLs
- `STACK_README.md` (root) — full stack inventory + tool selection rules
- `CLAUDE.md` (root) — gtm-os identity, project_architecture, behavioral rules
