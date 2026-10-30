# G-04 · Public-repo truth pass (GTM)

**Repo:** gtm-os

## Product
gtm-os is **public** on GitHub (checked 2026-10-30), but several docs describe it as private. For example, GTM-5 says the hub "goes public while gtm-os stays private". Docs that are wrong about who can read the repo lead people and agents to commit things that shouldn't be public. Make the docs true, and prove the tree is clean.

## Technical
1. **Docs.**
   - Find every claim that gtm-os is private or internal (`grep -rniE "stays private|private repo|internal only"`, plus CLAUDE.md, README.md, PROJECT_BRIEF.md and SESSION_BOOTSTRAP.md).
   - Rewrite each to "public by design; private inputs stay out of git", pointing at `AGENTS.md`.
2. **Scan.** Add `scripts/verify-public-safe.ts` (Bun, no new deps). It scans tracked files for:
   - email and phone patterns;
   - `sb_secret_`, `sk-` and `ghp_` key prefixes;
   - comp-figure patterns (`$` followed by a number and `k`, and `OTE`);
   - a denylist read from the `PII_DENYLIST` env, so names never appear in source.
   - It exits non-zero on a hit and prints file:line. Model it on gtm-os-hub's `lib/public-safety.ts` patterns, by reading them.
3. **CI.** Add `.github/workflows/public-safety.yml` running the scan on every PR and on pushes to main.
4. **Report.** Run the scan once, and list every hit in the PR body. **Do not "fix" hits by deleting files.** Each hit is Alex's call: redact, move to gitignored, or accept. History rewrites only ever happen with Alex.

## Must not
Delete content · rewrite history · put any denylist term in the repo.

**Done when:** the docs are accurate, the scan and CI exist, and the PR body lists the hits (or "0 hits").
