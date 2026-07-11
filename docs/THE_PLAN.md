# The Plan — Full-Stack GTM Engineer, 24-Week Half

**Status:** Active strategy doc. Master operating system for the next ~6 months.
**Kickoff:** 2026-05-25.
**Linear project:** [Full-Stack GTM Roadmap (24-week half)](https://linear.app/yedibalian/project/full-stack-gtm-roadmap-24-week-half-b26daecaf649) — **the source of truth for what's open.** This doc is strategy; Linear is status.
**Source roadmap:** `Phase_0/The-Full-Stack-GTM-Roadmap.pdf` (V1.1).
**Authoring confidence:** 70%, medium-high. The domain benchmark checklist, funnel mapping, and capstone framing below remain the plan of record; the time-boxing has been superseded (see amendment).

> ### ⚠️ Operating-model amendment (2026-06-27) — READ FIRST
> This plan was **de-time-boxed.** The "6–10 hrs/wk," fixed weekly rhythm, and W12/W24 anchor dates below are **no longer binding constraints** — they are historical targets kept for reference. The new model: **build freely; measure actual time-on-task and forecast remaining effort from real velocity** (mechanism = GTM University in `gtm-os-hub`). The long-term plan is an *output* of measured data, not a fixed schedule. Everything downstream of this — domain selection (D1/D2/D3/D5 Own · D4/D6/D7/D9 Do · D8 Recognize), the benchmark checklist, and the three capstones — **still holds.** Where a section below prescribes hours or dated weeks, read it as a sequencing sketch, not a commitment.

---

## Current State (as of 2026-07-11)

Status lives in Linear; this is the one-glance snapshot so a fresh session isn't misled by the dated week-plan below.

- **Phase 0 (Signal Pipeline exploration): complete.** Inventory (Parts A+C), R1 writeup draft, hygiene spec, dedup audit, signal seed list shipped under `Phase_0/`. Parts B+D (LinkedIn perf) deferred — **YED-41**.
- **Phase 1 architecture: LOCKED & signed off.** `Phase_1/architecture.md` (V2, cto-principal-architect pass) — **YED-44 Done.** Dedicated `signal` schema, REST/SDK access via `sb_secret_` key, Supabase MCP retired.
- **Supabase signal spine: SCAFFOLDED.** 11-table Kimball-style spine, 5 migrations under `supabase/` + `supabase/schema.md`, RLS-enabled, 0 rows — **YED-45 Done.** ⚠️ **The spine's Supabase project is currently unreachable (host NXDOMAIN → free-tier project paused/deleted); restore it in the Supabase dashboard before ingestion.**
- **Capstone 1 next step:** first real signal ingestion into the spine — **YED-56** (backlog, no code yet). This is the "prove the spine" step; do not jump to Capstone 2.
- **R1 writeup:** V0 draft, unpublished, one gap `[NEEDS YED-41]` — **YED-42** (in progress).
- **The Hub (`gtm-os-hub`, separate repo/session):** PII safety layer + "The Work, Live" page shipped; **GTM University vertical built** (YED-98, in progress); cockpit go-live pending (**YED-99** — needs service-role key + password + deploy). This is the instrument that makes the de-time-boxed model work.

**Front-door pointers:** real architecture = `Phase_1/architecture.md`; deployed schema = `supabase/schema.md`; open work = the Linear project above.

---

## North star (one sentence)

> Become a credible **Forward Deployed GTM Engineer** candidate at AI-native Series A–C companies by 2026-11-09, with a shipped portfolio of three increasingly-ambitious Clay-grade builds and a public body of work that proves systems thinking + AI/agent fluency + consultative-seller DNA.

This is **not** "AE learning to code." This is "the consultative seller who's lived twelve years of the workflow Clay-and-Clay-customers are automating, and can now build on the other side of it."

---

## Locked decisions (do not relitigate without explicit flag)

| Decision | Value | Source |
|---|---|---|
| Target role archetype | **Forward Deployed GTME** — broadest surface, hardest path, highest signal | Session 2026-05-20 |
| Weekly hour budget | ~~**6–10 hrs/wk** (sizing at 8 hrs/wk)~~ **De-time-boxed 2026-06-27** — no prescriptive hour/wk. Build freely; measure time-on-task + forecast velocity (GTM University). | Session 2026-05-20; amended 2026-06-27 |
| Cadence | ~~**24-week half** — two consecutive 12-week sprints~~ **No fixed cadence** (2026-06-27). W12/W24 anchors are historical targets, not binding. Plan is an output of measured data. | Amended 2026-06-27 |
| Own domains (4) | D1 Commercial · D2 GTM Systems · D3 GTM Engineering · D5 AI/Agent | Forced by FDGTME archetype |
| Do domains (4) | D4 Data & Analytics · D6 PMM & Narrative · D7 CS & Expansion · D9 Writing | Default |
| Recognize | D8 Leadership & Org Design | Default |
| Q1 anchor | Re-cast Signal Pipeline Phase 1 = D3 Capstone 1 + ship R1 writeup | Session 2026-05-20 |
| Q2 anchor | D3 Capstone 2 — Event-Driven Outbound Engine | Roadmap default |
| Sequence | Roadmap subsumes Signal Pipeline Phase 0/1; **W1–2 = clean Phase 0 closeout as first Track C ship** | Best-practice durable-build answer |
| D9 framing | Formal target = Do, **practiced at Own intensity** (1 post/wk + 1 brief/mo non-negotiable) | Mitigation for FDGTME-forced D9 demotion |
| D3 framing | Capstone 1 deeply shipped; Capstones 2 + 3 across Sprint 2 + future cycle | Forced by hour budget |
| Phase 1 architectural review | `alex:cto-principal-architect` invoked W2 before any build | Production-grade discipline |

---

## The 24-week macro plan — two sprints, six months, three anchors

```
SPRINT 1 (W1–12) — Foundation + Capstone 1
├── M1 (W1–4):  Phase 0 closeout · Phase 1 architecture lock · Build start
├── M2 (W5–8):  Phase 1 core build (Supabase spine, hygiene, ingestion)
└── M3 (W9–12): Phase 1 ships · R1 writeup published · Sprint 1 retro
                 ▼
              ANCHOR 1 (W12, ~2026-08-17):
              Phase 1 Signal Pipeline live + R1 writeup public

SPRINT 2 (W13–24) — Capstone 2 + first outbound wave
├── M4 (W13–16): Capstone 2 arch · Signal source ingestion · Stage 1 market map
├── M5 (W17–20): Capstone 2 core build (ICP filter, LLM personalization)
└── M6 (W21–24): Capstone 2 ships · Stage 4–5 outreach · Sprint 2 retro
                 ▼
              ANCHOR 2 (W24, ~2026-11-09):
              Capstone 2 live + first Tier 1 warm intros + Loom-led outreach

DECISION POINT (W12): Did hour budget hold? Role-market shift?
                       Push Stage 4 outreach to W13 or hold until W17?
```

---

## Three-track weekly rhythm at 8 hrs/wk

Default sizing. Concentrate Build on weekends; spread Study + Ship across weekdays.

| Day | Block | Track | Activity |
|---|---|---|---|
| **Mon** | 30 min, AM | C — Ship/Public | Draft LinkedIn post for the week (target: 1/wk hit rate ≥95%) |
| **Tue** | 60 min, PM | B — Study | Reading or hands-on benchmark (rotates D2/D4/D6/D7) |
| **Wed** | — | — | Rest / [employer] focus |
| **Thu** | 60 min, PM | B — Study | Reading or hands-on benchmark (continues from Tue) |
| **Fri** | 30 min, AM | C — Ship/Public | Ship LinkedIn post + 90-min weekly review (Domain 9 ritual) |
| **Sat** | 3 hrs, AM | A — Build | Concentrated Capstone build block |
| **Sun** | 2 hrs, AM | A — Build | Continuation + integration testing |

**Total: 8 hrs / week.** If a week hits 10, the extra goes to Build (compounds fastest). If a week hits 6, drop Tuesday Study and keep Build + Fri ship — those are the non-negotiables.

**Non-negotiables regardless of budget:**
1. 1 LinkedIn post shipped every Friday (Track C)
2. 90-min weekly review every Friday (Domain 9)
3. 1 decision-journal entry per week (Domain 9)

---

## Domain benchmark checklist — every build hour does double duty

Every domain benchmark from the roadmap, mapped to the sprint week it gets shipped. Zero waste: Capstone 1 alone clears 6 of these.

### D1 Commercial & Enterprise Sales (Own) — sharpen via real [employer] deals
- [ ] **Deal strategy memo** (3–5 pages) on a real [employer] prospect using MEDDPICC + SPICED — *target W6*
- [ ] **Mock discovery call recording** + self-review against SPICED — *target W10*
- [ ] **Exec-sponsor email** to a CRO-level buyer using only public signals — *target W14*

### D2 Full-Funnel GTM Systems (Own) — head-of-architecture artifacts
- [ ] **Capacity model in Sheets** for a 20-AE team hitting $40M new ARR, stress-tested — *target W8*
- [ ] **Rules-of-engagement document** for Commercial (≤500) vs Enterprise (>500) segments — *target W16*
- [ ] **One-page operating rhythm proposal** for a Series B AI-native company — *target W20*
- [ ] **Funnel decomposition retrospective** on one closed [employer] deal — *target W11*

### D3 GTM Engineering Craft (Own) — the three capstones
- [ ] **Capstone 1 — Phase 1 Signal Pipeline live** (Supabase spine + hygiene tier-1 + 2–3 signal types + R2 dashboard) — *ships W12*
- [ ] **Capstone 2 — Event-Driven Outbound Engine** (signal → ICP filter → LLM personalize → CRM write → sequence trigger, ≤48hr e2e) — *ships W24*
- [ ] Capstone 3 scoped (Forward-Deployed Consulting Simulation on a Tier 1 target) — *target W23 scope only; build deferred*

### D5 AI / Agent Engineering (Own) — leverage Empire State + Phase 1
- [ ] **Empire State eval harness** (10 golden examples + LLM-as-judge rubric + regression log) — *target W7*
- [ ] **Technical writeup published** ("Event intelligence as a GTM signal layer" — YED-42) — *ships W12 as part of Anchor 1*
- [ ] **One MCP server shipped** (even trivial — reads a Notion DB or a Supabase view) — *target W15*
- [ ] **Non-Empire-State agentic system** (5–10 hr build, single LLM + 3–5 tools + 1 eval suite) — *target W18*

### D4 Data & Analytics Fluency (Do, but elevated for R2 dashboard)
- [ ] **Mode SQL tutorial** (gold-standard working SQL) — *target W5*
- [ ] **Build one dbt model** (stg_ + fct_ on a real CRM export) — *target W9*
- [ ] **Metrics dictionary** (ARR/NRR/GRR/CAC/Payback/Magic Number/Rule of 40 with testable formulas) — *target W11*
- [ ] **Cohort retention analysis** from a CSV with 1-paragraph narrative — *target W17*

### D6 Product Marketing & Narrative (Do → Own)
- [ ] **Positioning one-pager for yourself** using Dunford template — *target W11* (also serves Stage 2)
- [ ] **Competitive battlecard** Clay vs one alternative, published — *target W19*
- [ ] **Strategic narrative piece** (Raskin-style 5-part, ~1,500–2,000 words, pinned on LinkedIn) — *target W22*

### D7 Customer Success & Expansion (Do)
- [ ] **Mutual Success Plan** filled for a real prospect — *target W13*
- [ ] **Health scorecard** (10-metric, weighted, for an AI-native SaaS) — *target W21*

### D9 Written Communication (Do at Own intensity)
- [ ] 12 weekly LinkedIn posts (Sprint 1) — *W1–12, hit rate ≥95%*
- [ ] 12 weekly LinkedIn posts (Sprint 2) — *W13–24*
- [ ] **1-page executive brief** ("Should our AI-native SaaS adopt a GTM Engineering function in H1?") — *target W10*
- [ ] **Narrative rewrite** of one LinkedIn post using SCQA + engagement compare — *target W18*

### D8 Leadership & Org Design (Recognize only)
- [ ] Read Horowitz "Hard Thing" + skim Working Backwards — *target end of Sprint 2*

---

## Plugin / agent assignments — when to invoke what

You already have ~240 `alex:*` skills + the full Vercel suite + MCPs. **Don't install more.** Use these five intentionally:

| Agent | When to invoke | Frequency |
|---|---|---|
| `alex:cto-principal-architect` | Every Capstone before any build — architecture review, infra choices, tech debt flags | W2 (Capstone 1), W14 (Capstone 2) |
| `alex:head-of-product` | Scope creep gut-checks, roadmap re-cuts, "should we even build this" | Monthly review week (W4, W8, W12, W16, W20, W24) |
| `alex:research-analyst` | Stage 1 market mapping, Tier-1 target deep research, competitive battlecard data | W11–12 (initial 60-co list), W17–19 (Tier 1 deepening) |
| `alex:learning-coach-mentor` | New-skill onboarding — dbt, SQL window fns, MCP, eval harnesses, vector stores | On-demand when crossing into a new D4/D5 sub-skill |
| `alex:systems-analyst` | Monthly retro deep dives, "why does this keep happening" patterns, second-order risk | W4, W12, W20 |

**External plugin to consider adding at Month 3 only:** a dbt-specific plugin or skill if the R2 dashboard needs more than `alex:data-engineering-lifecycle-and-principles` + `alex:scalable-database-design-and-sharding` cover. Defer the install decision until W9.

---

## Month-by-month detail

### Month 1 — Foundation (W1–4)

**Anchor deliverable:** Phase 0 closed, Phase 1 architecture locked, first 2 weeks of Capstone 1 build complete.

**Week 1 (2026-05-25 → 2026-05-31):**
- Track A: Close YED-41 (Parts B + D inventory) → ship Phase 0 closeout writeup as W1 LinkedIn post
- Track B: Mode SQL tutorial begins (D4)
- Track C: Phase 0 closeout writeup published Friday

**Week 2:**
- Track A: Invoke `alex:cto-principal-architect` → Phase 1 architecture review. Outputs locked: entity ID strategy, Notion↔Supabase relationship, conflict log location, n8n vs Inngest vs Supabase edge fns decision
- Track B: Mode SQL tutorial continues
- Track C: Architecture decision public writeup ("Choosing the runtime for Signal Pipeline Phase 1")

**Week 3:**
- Track A: Supabase spine scaffolded (events, signals, conflict_log tables created with schema rigor)
- Track B: dbt Fundamentals course begins
- Track C: Build snippet — "What 60 events of Empire State data taught me about signal hygiene"

**Week 4:**
- Track A: Hygiene tier-1 implementation begins (entity identity + provenance + dedup rules in code)
- Track B: dbt Fundamentals continues; first stg_ model on real data
- Track C: Build snippet — first dbt model walkthrough
- **End of Month 1 retro:** Did hour budget hold? Invoke `alex:systems-analyst` for the post-mortem.

### Month 2 — Phase 1 core (W5–8)

**Anchor deliverable:** Hygiene tier-1 running; 1 signal type ingested end-to-end; D1 deal memo shipped.

- **W5:** Deal strategy memo (D1) on a real [employer] deal · hygiene tier-1 finishes · D4 Mode SQL completes
- **W6:** Deal memo shipped · first signal type ingested (events flowing into Supabase via existing n8n) · D5 eval harness scoped
- **W7:** D5 eval harness for Empire State event-research skill ships (10 golden examples) · second signal type begins
- **W8:** Capacity model (D2) drafted in Sheets · second signal type live · **end of Month 2 retro**

### Month 3 — Capstone 1 ship + Sprint 1 close (W9–12)

**Anchor deliverable:** Phase 1 Signal Pipeline live in production. R1 writeup published. Positioning one-pager done.

- **W9:** R2 measurement dashboard built (the gate before next content skill) · first dbt fct_ model
- **W10:** R1 writeup polished (YED-42) · exec brief shipped (D9) · mock discovery recording (D1)
- **W11:** Positioning one-pager (D6 + Stage 2) drafted · funnel decomposition retro (D2) · metrics dictionary (D4)
- **W12:** **🚀 ANCHOR 1 SHIPS** — Phase 1 live · R1 writeup published on LinkedIn (the Build-Writeup format) · Positioning one-pager published · **Sprint 1 retro with `alex:head-of-product` + `alex:systems-analyst`**

### Month 4 — Capstone 2 begins (W13–16)

**Anchor deliverable:** Capstone 2 architecture locked. First signal source ingested. Stage 1 market map V1 (~30 companies).

- **W13:** Mutual Success Plan (D7) · Capstone 2 architecture review with `alex:cto-principal-architect` · exec-sponsor email (D1)
- **W14:** Capstone 2 build starts — signal source ingestion (job postings or BuiltWith or funding data) · D2 ROE document drafted
- **W15:** First MCP server ships (D5 benchmark — even trivial, e.g. reads Notion Events DB)
- **W16:** Stage 1 market map V1 (Tier 1: 10–12 named dream-fits) · ROE document ships · **end of Month 4 retro**

### Month 5 — Capstone 2 core (W17–20)

**Anchor deliverable:** ICP filter + LLM personalization + CRM write working end-to-end. Cohort retention analysis published.

- **W17:** Cohort retention analysis (D4) · ICP filter logic built · Tier 1 deepening (~25 Tier 2 companies)
- **W18:** Non-Empire-State agentic system (D5 hands-on bench) · LLM personalization layer · narrative rewrite (D9)
- **W19:** Competitive battlecard Clay vs alternative (D6) published · CRM write + dedup logic
- **W20:** Operating rhythm proposal (D2) for Series B AI-native · sequence trigger live · **end of Month 5 retro** with `alex:systems-analyst`

### Month 6 — Capstone 2 ship + outbound wave (W21–24)

**Anchor deliverable:** Capstone 2 live. First Tier 1 outbound wave with Loom-led artifact gift. Sprint 2 retro.

- **W21:** Capstone 2 end-to-end test (≤48hr e2e timing target) · health scorecard (D7)
- **W22:** Strategic narrative piece (D6, 1,500–2,000 words) published · Capstone 2 polish
- **W23:** Capstone 3 scoped (Tier 1 target picked, current-state diagnosis drafted) · prospecting map built in HubSpot (Stage 4)
- **W24:** **🚀 ANCHOR 2 SHIPS** — Capstone 2 live · first 5–10 Loom-led outbound touches to Tier 1 hiring managers · Sprint 2 retro · decision point on Sprint 3 (continue / pivot / start interviewing)

---

## Job-Hunt Funnel — Stage 1–5 mapping

The roadmap's Part 2 ("The Search as an AI-Native GTM Motion") gets run alongside, not after, the build. Stages 1–3 happen *during* the 24 weeks; Stages 4–5 fire in Month 6; Stages 6–8 (Eval → Offer → Ramp) are out of scope here.

| Stage | What it is | When it happens here |
|---|---|---|
| **1 — Market Mapping** | Ranked 60-company target list, tiered by fit | W11–12 (V1, ~30 cos) → W16 (V2, ~60 cos, Tier 1 named) |
| **2 — Positioning** | Dunford one-pager + LinkedIn overhaul + minimal site | W11 (one-pager) → W12 (LinkedIn overhaul) → Hub live in its own repo `AlexYedi/gtm-os-hub` (rolling from W3; supersedes the W16 Framer site) |
| **3 — Signal Generation** | Public body of work flywheel | Continuous W1–W24 (1 post/wk + 2 major writeups + 2 capstones) |
| **4 — Prospecting** | Named hiring mgr + skip + peer + recruiter + connector at each Tier 1 target | W23 (map) → W24 (first warm intros) |
| **5 — Outreach** | Multi-channel value-first, artifact-led not resume-led | W24 onward (first wave of 5–10 Loom-led artifact-gift touches) |

**Critical: the Hub** is now its own repo (`AlexYedi/gtm-os-hub`) — a live dashboard-as-portfolio pulled forward to W3, reaching R2-dashboard completeness by W9. It supersedes the Framer brochure (amended 2026-06-13), is developed in its own session, and coordinates with this repo over external APIs only (no shared code).

---

## Monthly review ritual (90 minutes, last Friday of each month)

1. **Hour audit** — actual hrs delivered vs. 32 (4 weeks × 8). If <24, re-cut next month's scope.
2. **Track ship check** — Did Track C ship every week? If a miss, why?
3. **Benchmark progress** — Update the checklist above. Any benchmark slipped >2 weeks gets a `alex:head-of-product` review.
4. **Decision journal review** — Pull the week's entries; calibrate confidence (predicted vs actual outcomes).
5. **`alex:systems-analyst` deep dive** at W4, W12, W20 — "why does this keep happening" patterns.
6. **[employer] exposure check** — Did the plan create friction at [employer]? If yes, what to defer.
7. **Public surface check** — LinkedIn engagement arcs (8–12 wk, not week-to-week), inbound recruiter DMs trend, profile views/wk.
8. **Update THE_PLAN.md** — append the retro under a `## Retros` section at the bottom; do not delete.

---

## Risk register

Top 5 ways this breaks, with mitigations.

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | [employer] Q-end pressure crushes build hours below 6 | High | High | Sprint 1 reserves W11 as a buffer week; Sprint 2 reserves W23. Don't backfill missed weeks — absorb the slip into the next anchor. |
| 2 | Phase 1 architecture decisions stall (Notion↔Supabase, runtime choice) | Medium | High | Time-box W2 architecture review at 2 weeks max. If unresolved, ship the simplest viable option (Supabase + cron + scripts) and migrate later. |
| 3 | Capstones 2 + 3 slip due to interview pressure later | Medium | Medium | Front-load Capstone 1 build hours in Sprint 1. Capstone 3 is intentionally scope-only in this plan; full build is for the future cycle. |
| 4 | Motivation decay around W8–10 (mid-sprint dip) | Medium | Medium | Public commitments + Linear milestone for W12 creates external accountability. Schedule a "show progress to one outside person" check at W9. |
| 5 | Role-market shift (AI-native hiring slows, FDGTME role gets diluted) | Low | High | Plan stays defensible across Head of Architecture / Enterprise Growth Strategist / FDGTME — the four Own-domains cover all three. Decide role-fit at offer stage based on what comes in. |

---

## What I am explicitly NOT doing

To prevent drift:

- **Not building a sixth content skill before R2 dashboard ships.** Clay red-flag #4.
- **Not restarting the Empire State events pipeline.** It is the signal engine for Stage 3 of the job-hunt funnel, and the input to Capstone 1.
- **Not building the Hub as a Framer brochure.** Superseded 2026-06-13 by a live Next.js dashboard in its **own repo** (`AlexYedi/gtm-os-hub`) — useful from W3, reaches the W9 R2-dashboard gate. Developed in its own session; coordinates with this repo over APIs only.
- **Not Owning D3 the way the deck assumes (3 capstones).** Capstone 1 deeply shipped; Capstone 2 ships; Capstone 3 scope-only. Defensible posture: "Owned D3 at production-grade for Capstone 1, shipped Capstone 2, Capstone 3 scoped for next cycle."
- **Not constructing a watchlist from external sources.** Stage 1 ICP starts from Clay's customer roster + existing Empire State data + named anchors from the Clay blog. No spray-and-pray.
- **Not formally pursuing D8 (Leadership & Org Design).** Two books on the side, no benchmarks.
- **Not adding more plugins.** The `alex:*` skill pack + Vercel suite + existing MCPs is enough. Re-evaluate at W12 only.

---

## Retros

*Append monthly review notes below — never delete. This section is the audit trail for the plan.*

### M1 retro (written 2026-07-11, target was 2026-06-26 — filled late during a realignment pass)

*Reconstructed from Linear + git history rather than a live end-of-month review; the review ritual itself slipped, which is part of the finding.*

- **What shipped vs. plan:** M1's substance largely landed, but not on the prescribed weekly rhythm. Phase 0 closed (inventory Parts A+C, R1 draft, hygiene spec, dedup audit, seed list). Phase 1 architecture was reviewed and **locked** with `cto-principal-architect` (YED-44 Done, `Phase_1/architecture.md` V2). The Supabase signal spine was **scaffolded** — 11-table schema, 5 migrations, RLS (YED-45 Done). That clears the M1 anchor deliverable ("Phase 0 closed, Phase 1 architecture locked, build started").
- **The big unplanned decision:** on **2026-06-27 the whole plan was de-time-boxed** — the 8 hrs/wk + fixed-cadence model was abandoned in favor of measuring actual time-on-task and forecasting from velocity. This is why the weekly Track A/B/C rhythm and the monthly review ritual didn't run as written: the model they belonged to was itself replaced mid-month.
- **Infra churn that cost time:** Supabase footprint was reorganized (original `gtm-os-project` spine deleted; account split across two orgs; Supabase MCP retired to stop cross-account token bleed; access moved to REST + `sb_secret_` keys). The spine's target project also moved (coexist-in-GTM_OS_HUB → dedicated `Signal_Pipeline_Analytical_Spine`). Real work, but not on the benchmark checklist.
- **Where the plan drifted from reality:** THE_PLAN.md and SESSION_BOOTSTRAP.md were **not** updated as the above happened — they stayed pointed at Phase 0 "current task" and a binding hour budget until this 2026-07-11 realignment. Retros went unfilled. Lesson: **the front-door docs need a lightweight update trigger tied to Linear issue closure, or they silently rot.**
- **Carried forward:** first signal ingestion (YED-56) is the real next step and hasn't started. R1 writeup (YED-42) still blocked on YED-41 (manual LinkedIn export). GTM University cockpit go-live (YED-99) is the unblock for the measurement model this amendment now depends on. **New blocker surfaced 2026-07-11:** the spine's Supabase project host no longer resolves (paused/deleted) — must be restored before ingestion.
- **Track C (public posting) reality:** not verified in this pass; LinkedIn is ground truth and the published-tracking gap (Notion can't tell what posted) remains open.

<!-- M2 retro (target 2026-07-24): -->
<!-- M3 retro (target 2026-08-21) — Sprint 1 retro: -->
<!-- M4 retro (target 2026-09-18): -->
<!-- M5 retro (target 2026-10-16): -->
<!-- M6 retro (target 2026-11-13) — Sprint 2 retro: -->
