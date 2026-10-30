---
name: gtm-os-guardrails
description: Rules for gtm-os, the public signal-layer and planning repo: public-repo hygiene, no scraping, the retired spine, no live writes. Load for any change to docs, skills, scripts, lib or research.
triggers:
  - research
  - spine
  - supabase
  - signal
  - university
---

# gtm-os guardrails

- **Public repo.** Tracked files are published. Raw research and transcripts stay in gitignored `raw/` folders.
- **Data plane.** The MI graph lives on the Empire Supabase project and is read over REST. The Empire repo owns all writes, through `spine_client.py`. The old spine is retired: don't build on it.
- **Ethics.** No LinkedIn or X scraping.
- **Verify.** `bun install && bun run lint && bun run typecheck && bun run test` (several turbo tasks currently run 0 tasks; say so in the PR rather than claiming coverage).
