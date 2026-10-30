# AGENTS.md

**Read `CLAUDE.md` first.** This repo is **public on GitHub**, so treat every tracked file as published.

## Rules every automated change follows
1. You must never commit `.env*`, raw research (for example `research/**/raw/`), transcripts, or confidential names (employers, accounts, prospects, comp figures).
2. No scraping: you must not add LinkedIn or X scraping. Public APIs, RSS, official endpoints and Alex's own exports only.
3. No fabricated numbers. If data is missing, say so.
4. The old signal spine (`abkvgihlbwfloentugtd`) is retired, so you must not build against it. The MI graph is read over REST from the Empire project. Writes belong to the Empire repo's `spine_client.py`, never here.
5. No live writes to Supabase, Notion, HubSpot or Linear from the sandbox. Tests use fixtures.
6. Specs live in `docs/specs/gtm/`. The cross-repo index is in `AlexYedi/Empire_State_Events_Pipeline_Take_3`, `docs/specs/README.md`. Put the spec ID (G-n) in the PR title.
