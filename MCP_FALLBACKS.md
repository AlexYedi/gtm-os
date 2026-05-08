# MCP Fallbacks — gtm-os signal-plane

Copy-pasteable `.mcp.json` fragments for every server in the signal-plane.
Use these when a desktop connector has broken and you need a known-good
project-level escape hatch. Drop the fragment into the `mcpServers` block
of `.mcp.json`, populate `.env`, and restart Claude Code.

> **Note**: not all hosted MCPs accept arbitrary clients. Notion, Linear,
> and Vercel use OAuth and will redirect to a browser on first call —
> the same flow as the desktop connector, just driven from Claude Code
> instead of the app. Google services (Calendar, Gmail) and Granola do
> not currently expose hosted MCPs reachable from a custom client; for
> those, the desktop connector is the only path.

## Schema reference

```json
{
  "mcpServers": {
    "<friendly-name>": {
      "type": "http" | "sse" | "stdio",
      "url": "<endpoint>",                    // http/sse only
      "headers": { "<H>": "<V>" },            // optional, supports ${ENV}
      "command": "<binary>",                   // stdio only
      "args": ["<arg>"],                       // stdio only
      "env": { "<K>": "${ENV}" }              // stdio only
    }
  }
}
```

`${ENV_VAR}` is substituted from process env at session start. Variables
not set fall through as literal `${...}` and most servers will reject
the auth.

---

## 1. Notion

Hosted, OAuth. Same shape Claude Code's marketplace plugin uses.

```json
"notion": {
  "type": "http",
  "url": "https://mcp.notion.com/mcp"
}
```

After restart, run `/mcp` and complete the browser OAuth.

---

## 2. HubSpot

Hosted, accepts a Private App token via Bearer header. Use when the
desktop connector loses its session.

```json
"hubspot": {
  "type": "http",
  "url": "https://mcp.hubspot.com/anthropic/v1/mcp",
  "headers": {
    "Authorization": "Bearer ${HUBSPOT_PRIVATE_APP_TOKEN}"
  }
}
```

Token must have CRM read/write scopes (see `.env.example`).

---

## 3. Linear  (active in `.mcp.json` — primary fix)

The SSE endpoint at `https://mcp.linear.app/sse` flakes intermittently.
The streamable-HTTP endpoint is more reliable.

```json
"linear": {
  "type": "http",
  "url": "https://mcp.linear.app/mcp"
}
```

OAuth on first use.

---

## 4. PostHog

Hosted MCP at `mcp.posthog.com`. OAuth-based.

```json
"posthog": {
  "type": "http",
  "url": "https://mcp.posthog.com/mcp"
}
```

For non-OAuth direct API access (script fallback), use
`POSTHOG_API_KEY` against `https://us.posthog.com/api/`.

---

## 5. Clay

Hosted MCP, OAuth.

```json
"clay": {
  "type": "http",
  "url": "https://mcp.clay.com/mcp"
}
```

For direct-API fallback use `CLAY_API_KEY` against the standard Clay API.

---

## 6. n8n  (active in `.mcp.json` — primary fix)

Self-hosted on `yedimaing.app.n8n.cloud`. JWT auth with
`aud: "mcp-server-api"`. Generate at n8n → Settings → API → MCP Tokens.

```json
"n8n": {
  "type": "http",
  "url": "${N8N_MCP_URL}",
  "headers": {
    "Authorization": "Bearer ${N8N_MCP_TOKEN}"
  }
}
```

`N8N_MCP_URL` defaults to `https://yedimaing.app.n8n.cloud/mcp`. If the
endpoint path differs in your n8n version, override it via env.

If JWT auth misbehaves, fall back to the older `mcp-remote` shim with
OAuth (slower, requires extra hop):

```json
"n8n": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "mcp-remote", "https://yedimaing.app.n8n.cloud/mcp"]
}
```

---

## 7. Supabase

Hosted MCP. Auth via personal access token (NOT the project service
key — those are separate).

```json
"supabase": {
  "type": "http",
  "url": "https://mcp.supabase.com/mcp",
  "headers": {
    "Authorization": "Bearer ${SUPABASE_ACCESS_TOKEN}"
  }
}
```

Or use the local stdio adapter (more battle-tested):

```json
"supabase": {
  "type": "stdio",
  "command": "npx",
  "args": [
    "-y",
    "@supabase/mcp-server-supabase@latest",
    "--access-token",
    "${SUPABASE_ACCESS_TOKEN}"
  ]
}
```

`SUPABASE_GTM_OS_API_KEY` in `.env` is the project's service-role key
and is for direct REST/SQL — not for the MCP itself.

---

## 8. Granola

Granola's MCP runs as a local helper bundled with the desktop app — no
hosted endpoint is published. **Project-level fallback is not possible.**
If the desktop connector breaks, the recovery path is:

1. Quit Granola fully (menu bar → Quit).
2. Reopen Granola, sign back in.
3. In Claude Code → Settings → Connectors, remove and re-add the
   Granola connector.

---

## 9. Vercel

Hosted MCP, OAuth.

```json
"vercel": {
  "type": "http",
  "url": "https://mcp.vercel.com/api/mcp"
}
```

OAuth on first use; scoped to the team that authorizes.

---

## 10. Google Calendar

No hosted MCP exists for Google services that accepts arbitrary clients
— Google's OAuth flow requires Anthropic's verified-app client ID, which
is only present in the desktop connector. **Project-level fallback is
not possible.** Recovery:

1. Claude Code → Settings → Connectors → remove Google Calendar.
2. Re-add and complete OAuth.
3. If the OAuth screen rejects scopes, sign out of Google in the
   browser first to clear cached consent, then retry.

---

## 11. Gmail

Same constraint as Calendar — no portable fallback. Recovery is the
same flow.

---

## Verification queries

Once a fallback is active, run these read-only probes to confirm. The
exact tool names will be prefixed with the server name (e.g.
`mcp__notion__search`).

| Server | Probe |
|---|---|
| notion | search Events DS `9dcbc999-b4ed-4a51-b48a-10aaf171f1ba`, expect ≥25 rows |
| hubspot | `search_crm_objects` on `contacts` with `limit: 1`, expect `total > 0` |
| linear | `list_issues` with `assignee: "me"`, expect non-error response |
| posthog | `projects-get`, expect ≥1 project |
| clay | `find-and-enrich-company` with `anthropic.com`, expect "Anthropic" |
| n8n | list active workflows, expect array |
| supabase | `list_projects`, expect the gtm-os ref `nnywrmetdoixdbevvsvf` |
| granola | `query_granola_meetings` with any query, expect coherent response |
| vercel | `list_teams` then `list_projects`, expect ≥1 project |
| google-calendar | `list_events` for the next 7 days, expect array |
| gmail | `search_threads` with any query + `newer_than:1d`, expect array |
