# MCP Fallbacks — gtm-os

**Purpose:** alternative configurations for any MCP server in `.mcp.json` that doesn't authenticate or function cleanly from Claude Code CLI on first install.

**Use this when:** a server in the Tier 1 list (`MCP_SETUP.md`) shows as connected in `/mcp` but tools don't work, OR OAuth fails to complete from CLI even though the same server works in Claude.ai chat.

---

## 1. Google Calendar + Gmail — self-hosted Workspace MCP (optional escape hatch)

**Updated 2026-05-19:** The previously documented URLs (`https://gcal.mcp.claude.com/mcp`, `https://gmail.mcp.claude.com/mcp`) **return HTTP 404 via `mcp-remote`**. They are internal infrastructure for the Claude.ai connector bridge, not third-party MCP endpoints. The corresponding `.mcp.json` entries were removed.

**Steady-state path:** authorize Gmail + Google Calendar on claude.ai → Settings → Connectors. The CLI sees them automatically as `mcp__claude_ai_Gmail__*` and `mcp__claude_ai_Google_Calendar__*`. This is documented in `MCP_SETUP.md` Wave 3 and is the default.

**When to consider the self-hosted fallback below:**

- The Claude.ai bridge is unavailable, deprecated, or returning errors.
- You need a scope the bridge doesn't grant (e.g., `gmail.modify` for labeling/archiving, broader Calendar write scopes).
- You want Workspace MCP to also work for other gtm-os automation outside Claude Code (e.g., a Vercel function calling the same MCP server).

Otherwise, **don't bother** — the bridge is simpler and already works.

**The fallback:** run a Google Workspace MCP server locally with your own GCP OAuth credentials. More setup, but gives you full scope control and decouples from the Claude.ai bridge.

### Step-by-step

#### 1a. Create a GCP project + OAuth client

1. **Google Cloud Console → Create project** named `gtm-os-mcp` (or use an existing one).
2. **APIs & Services → Library → enable:**
   - Google Calendar API
   - Gmail API
3. **APIs & Services → OAuth consent screen:**
   - User type: External
   - App name: `gtm-os-mcp`
   - Add yourself as a test user (Testing publish state is fine — no need to verify the app)
   - Scopes: add `https://www.googleapis.com/auth/calendar`, `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/gmail.send` (add `gmail.modify` only if you want Claude to label/archive)
4. **APIs & Services → Credentials → Create credentials → OAuth client ID:**
   - Application type: Desktop app
   - Name: `gtm-os-mcp-desktop`
   - Download the JSON. Save it locally as `~/.config/gtm-os-mcp/google-oauth.json` (path must match the env var below).

#### 1b. Add a Workspace MCP entry to `.mcp.json`

(The previous `google-calendar` and `gmail` entries pointing to `*.mcp.claude.com` were already removed on 2026-05-19; this fallback adds a fresh entry.)

```json
"google-workspace": {
  "command": "npx",
  "args": ["-y", "@taylorwilsdon/google_workspace_mcp@latest"],
  "env": {
    "GOOGLE_OAUTH_CREDENTIALS_PATH": "${GOOGLE_OAUTH_CREDENTIALS_PATH}",
    "GOOGLE_WORKSPACE_SERVICES": "calendar,gmail"
  }
}
```

> Package name above is illustrative — when implementing, search npm for the most-maintained `google-workspace-mcp` server. As of late 2025, `@taylorwilsdon/google_workspace_mcp` and `mcp-google-workspace` are the two leading options. Pick whichever has a recent commit and clear OAuth-flow docs.

#### 1c. Add to `.env`

```
GOOGLE_OAUTH_CREDENTIALS_PATH=/Users/<you>/.config/gtm-os-mcp/google-oauth.json
```

#### 1d. First-run auth

Restart Claude Code. The Workspace MCP server will start a local OAuth flow on first call — opens a browser, you grant scopes, server writes a refresh token to `~/.config/gtm-os-mcp/token.json` (or wherever the package stores it). After that, no further auth needed unless tokens expire (~6 months).

#### 1e. Verify

```
List my Calendar events for the next 7 days.
Search Gmail for messages from the last 24 hours containing "intro".
```

---

## 2. Clay — DEFERRED as of 2026-05-08

**Status: deferred. Both MCP paths failed. Use Clay web UI manually.**

### What we tried

**A. `.mcp.json` v3 API path** — `https://api.clay.com/v3/mcp` + `Authorization: Bearer $CLAY_API_KEY`. `mcp-remote` registered zero tools; symptom indistinguishable from "not connected." Suspected plan-tier 403 (Clay's v3 MCP endpoint requires a paid tier).

**B. Desktop Connectors path** — Claude desktop → Connectors → Sales → Clay → Connect. OAuth completed cleanly. The consent screen explicitly mentioned MCP query access as part of the grant. **But the resulting tool surface contained only the auth-handshake stubs** (`mcp__plugin_sales_clay__authenticate`, `mcp__plugin_sales_clay__complete_authentication`) — no query tools. Reproduced across multiple disconnect/reconnect cycles in fresh sessions on 2026-05-08.

### Most likely root cause

One of:
- **Clay's Connectors integration is auth-stub-only** at this point in time — the consent screen mentions MCP scope as a forward-looking promise, but query tools haven't shipped.
- **Query tools sit behind an undisclosed plan-tier gate** — OAuth succeeds, the grant claims MCP access, but Clay's backend won't issue tools until a paid tier kicks in. Same plan-tier pattern that broke the v3 API path.

Either way, not fixable from our end without engaging Clay support or upgrading the plan.

### Recommendation: C — defer

- Use Clay manually via web UI for enrichment work.
- Treat the signal-plane probe as 8 Layer-1 (`.mcp.json`) + 2 Layer-2 (Gmail/Calendar via Claude.ai bridge) active + Clay deferred. Probe should NOT re-flag Clay as a regression — it's a known-deferred state (see the `verification_cadence` memory).
- Phase 0 inventory will quantify whether Clay-via-MCP is high-leverage enough to justify a plan upgrade. Until then, don't retry.

### Re-test trigger

Re-test Clay only on:
- A Clay plan upgrade.
- A Clay product update mentioning MCP query tools shipping.
- An explicit user request ("re-test Clay").

Re-test procedure: see `MCP_SETUP.md` Wave 4 "Re-test procedure (when triggered)".

### Other options (not currently recommended)

- **A. Upgrade Clay plan** — only if Phase 0 inventory shows Clay-via-MCP is high-leverage. Clay's standard paid plans start ~$149/mo; verify live pricing — Clay updates often.
- **B. HubSpot enrichment as a partial substitute** — HubSpot has built-in firmographic enrichment for paid tiers. Less GTM-specific than Clay but $0 marginal cost since HubSpot is already wired.

---

## 3. n8n (if hosted URL doesn't accept the API key format)

**The problem:** n8n's MCP endpoint format depends on the n8n version on `yedimaing.app.n8n.cloud`. If the auth header format in `.mcp.json` doesn't match what your instance expects, calls return 401.

**Diagnostic:**

```bash
curl -H "Authorization: Bearer ${N8N_API_KEY}" \
     https://yedimaing.app.n8n.cloud/mcp-server/http
```

If 401: try `X-N8N-API-KEY` header instead:

```json
"args": [
  "-y",
  "mcp-remote",
  "https://yedimaing.app.n8n.cloud/mcp-server/http",
  "--header",
  "X-N8N-API-KEY:${N8N_API_KEY}"
]
```

If still 401: check n8n cloud's API docs for your specific version's auth scheme. Some n8n cloud tiers don't expose the MCP server endpoint at all — check **Settings → n8n API → MCP** in your n8n UI.

---

## 4. Supabase (if Personal Access Token auth fails)

**The problem:** the `@supabase/mcp-server-supabase` package occasionally has issues with Personal Access Token format on first install.

**Fallback:** the official Supabase MCP server can also accept a project-scoped service role key via env. Less ideal (broader blast radius if leaked) but works.

```json
"supabase": {
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase@latest"],
  "env": {
    "SUPABASE_URL": "${SUPABASE_URL}",
    "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
  }
}
```

Add to `.env`:
```
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Security flag:** service role key bypasses RLS. Only use this fallback if Personal Access Token approach fails AND you understand the implications.

---

## 5. PostHog (if hosted URL has rate-limit issues)

PostHog's hosted MCP can throttle aggressively on free/small plans. If you hit rate limits frequently, the local NPM package (`@posthog/mcp` or community equivalents) can be configured to use your project's API endpoint directly with longer-lived auth.

**Fallback config:**

```json
"posthog": {
  "command": "npx",
  "args": ["-y", "@posthog/mcp@latest"],
  "env": {
    "POSTHOG_API_KEY": "${POSTHOG_API_KEY}",
    "POSTHOG_HOST": "https://us.i.posthog.com"
  }
}
```

(Adjust `POSTHOG_HOST` if you're on EU cloud.)

---

## 6. Vercel + Linear + Granola (OAuth-based, hosted)

These three are the most reliable hosted MCPs in the Tier 1 list. Failure modes are almost always one of:

- OAuth flow not completing (browser popup blocked, tab closed too early)
- Token expired (re-run `/mcp` to re-auth)
- Wrong workspace selected during OAuth grant (Vercel team scope, Linear workspace, Granola account)

**Fallback:** none usually needed. If any of these consistently fail, file an issue with the vendor — these are vendor-maintained MCPs and outside our config control.

---

## When to add a fallback to `.mcp.json` vs keep it here as a doc

- **Add to `.mcp.json` and remove the original entry** if the hosted URL fails completely and the fallback is the steady-state config (e.g., Google Workspace via npm package after confirming hosted URLs don't work).
- **Keep in this doc only** if the fallback is a one-time diagnostic or temporary workaround you might remove later (e.g., Supabase service role key fallback).

When you switch to a fallback, update `MCP_SETUP.md` Wave 1/2/3 instructions to reflect the new setup steps so future fresh installs follow the working path, not the broken one.

---

## Related

- `MCP_SETUP.md` — primary setup doc (try this first)
- `.mcp.json` — current config
- `.env.example` — env vars for current config (update if fallbacks add new vars)
