# apps/dashboard — The Hub

One Next.js app. Two audiences. Three depths. The gtm-os **Hub**: a live, projection-based
surface that replaces the planned Framer brochure (`Phase_1/architecture.md` §9) and the
internal R2 measurement dashboard (§8) with a single artifact that is useful from day one
and compounds into the portfolio.

**Status:** V0 scaffold (W3, 2026-06-11). The Work, Live page renders from GitHub.
**Lineage:** supersedes `Phase_1/architecture.md` §8 + §9; pulls forward `THE_PLAN.md` W9/W16.
**Tracking:** Linear (issues) · ChatPRD (PRD). See §8.

---

## 0. Confidentiality & PII contract — READ FIRST (risk #3)

The public surface reads from systems full of PII and employer-confidential data. Leaks here
are the single most likely Phase 1 mistake. The control is **default-deny, defense in depth.**

### Threat model

| Source | Leak vector |
|---|---|
| GitHub | Commit **author email** (in every commit), names/secrets in messages or diffs |
| Linear | Named hiring managers, target companies, deal data, **GKY-employer-confidential** matter |
| Notion | Embedded prospect/customer PII inside artifacts |
| Supabase | People/Companies rows — emails, LinkedIn URLs |

> Note the second axis beyond GDPR PII: **employer confidentiality.** The job-hunt funnel
> (Stage 4 prospecting, intent-to-move) must never reach a public surface. The publish gate
> (layer 2) handles this — that content simply never gets marked public.

### Three layers

1. **Allowlist projection (type-enforced).** Public renderers consume only `Public*` types
   that omit PII *at the type level*. Leaking a field is a TypeScript compile error, not a
   runtime hope. The GitHub raw type (`lib/sources/github.ts`) does not even declare
   `author.email` — we cannot render what we never read.
2. **Publish gate (private by default).** Nothing is public unless explicitly marked: Linear
   `public` label, a repo allowlist, tagged Notion pages. Default-deny.
3. **Egress scrubber + CI gate.** `assertPublicSafe()` (`lib/public-safety.ts`) serializes the
   assembled public payload and scans for email/phone/LinkedIn patterns + a denylist of
   sensitive entities. On a hit it **throws**, failing the build/test. Shipped as the first
   module, with `public-safety.test.ts`, before any page existed.

### Operational rules
- Every public data fetch ends with `assertPublicSafe(payload, where)`.
- The cockpit (Tier 3) is the only place raw/sensitive data appears, and it is auth-gated.
- Supabase public reads go through `v_public_*` views that exclude PII columns by construction.
- Audit the rendered public JSON before the first public deploy.

---

## 1. Surfaces — progressive disclosure

A visitor descends only as far as their interest takes them.

| Tier | View | Route | Audience | Auth |
|---|---|---|---|---|
| 1 | **The Work, Live** (leads) | `/` | Recruiter / hiring manager / anyone | public |
| 2 | **Living System Map** (drill-in) | `/system` | Technical interviewer / curious engineer | public |
| 3 | **The Cockpit** (operate) | `/cockpit` | Alex daily; shown selectively in interviews | gated |

A toggle on the public site flips Tier 1 ↔ Tier 2. Same data, three depths.

---

## 2. Stack
Next.js App Router (15.5 → **16 + Cache Components is a tracked upgrade**) · TypeScript ·
Vercel · Tailwind v4 (CSS-first `@theme`) · shadcn/ui (cockpit build-out) · recharts (charts) ·
Framer **Motion** (animation library — note: we killed Framer-the-builder, kept Framer-Motion).
Package manager: bun (monorepo convention). Lives at `apps/dashboard` in the existing Turborepo.

---

## 3. Data sources — the projection layer
The dashboard owns **near-zero canonical state**. It is a read/aggregation layer over the
sources of truth — `source_of_truth_discipline` made visible:

```
Linear  (GraphQL) → what's next · in-progress · blockers · logged ideas (label: idea)
GitHub  (REST)    → shipped: commits · PRs · releases   → "The Work, Live"
Notion  (API)     → produced artifacts: writeups · briefs · drafts
Supabase          → metrics · evals · signals · funnel  (lights up W3→W7→W9)
repo / THE_PLAN.md → structural skeleton: domains · milestones · funnel
```

This also fixes the plan-tracker's flaw: it stored status in IndexedDB, duplicating Linear.
V2 reads status *from* Linear.

---

## 4. Freshness model
**Snapshot, not per-request live pull.** A Vercel Cron job (+ Linear/GitHub webhooks for
instant) reads sources, normalizes, writes a `dashboard_snapshot` to Supabase; Server
Components render from Supabase. Why: render never blocks on a flaky upstream; trend history
for free; **it's the same ingest→normalize→store→project pattern as Capstone 1** — building the
Hub is practice for the capstone. *V0 exception:* direct cached reads (ISR `revalidate`) so the
Hub isn't blocked on the spine; migrate to the snapshot path once the W3 schema lands.

---

## 5. Auth
Public (Tiers 1–2): unauthed, ISR, PII-safe `v_public_*` projections only. Cockpit (Tier 3):
`/cockpit/*` behind a password middleware for V0/V1 → Clerk free tier if a second viewer needs
in (matches §8's "Clerk in Phase 2").

---

## 6. What's live when (no fabricated numbers)

| Panel | Source | Live |
|---|---|---|
| Shipped stream (commits/PRs/releases) | GitHub | V0 (now) |
| What's next · in-progress · blockers · ideas | Linear | V0–V1 |
| Plan progress (domains/milestones/funnel) | repo + Linear | V0–V1 |
| Artifacts (writeups, briefs) | Notion | V1 |
| Eval runs (pass/fail, rubric) | Supabase `eval_runs` | W7 |
| Funnel · signal precision · run health | Supabase | W9 |

Empty panels render as `⊘ instrumenting — wired, awaiting first run`. Never fake numbers.

---

## 7. Phased build (against 6–10 hr/wk)
- **V0 — W3 (~6–8 hrs):** scaffold + safety layer + The Work, Live (GitHub) → deploy. *This file + the safety module is the start.*
- **V1 — W4–6 (~8 hr/wk):** Cockpit (authed; migrate plan progress off IndexedDB → Linear) + Living System Map + Notion artifacts; move to snapshot-via-Supabase; wire honest empty panels.
- **V2 — W7–9 (passive):** eval panels light up (W7), funnel/signals (W9). **This becomes the §8 R2 dashboard milestone** — shell front-loaded, data catches up.

---

## 8. Reconciliation & tracking
- `CLAUDE.md` — locked decision updated: Hub = unified live Next.js dashboard; supersedes Framer.
- `docs/THE_PLAN.md` — W16 Framer line + "NOT doing: Framer" updated; Hub pulled to W3 as a rolling artifact reaching R2-completeness by W9.
- `Phase_1/architecture.md` §8 + §9 — marked unified (this app).
- `apps/plan-tracker` — legacy once the cockpit ships.
- **Linear** — issues under "Full-Stack GTM Roadmap (24-week half)" (V0/V1/V2). Single source of truth for open work.
- **ChatPRD** — product requirements doc; the product-intent artifact. Linked from the Linear epic.
