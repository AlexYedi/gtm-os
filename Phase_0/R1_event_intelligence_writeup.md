# Event Intelligence as a GTM Signal Layer

**Author:** Alex Yedibalian
**Status:** V0 draft, 2026-05-20 — Phase 0 exit deliverable for the Signal Pipeline project (gtm-os). Linear: YED-42.
**Audience:** Hiring managers evaluating Clay-tier GTM engineering candidates; future-me reading 6 months from now to remember what Phase 0 actually proved.
**Gaps:** One quantitative input remains — `[NEEDS YED-41]` (LinkedIn engagement metrics), an Alex-led manual Creator Hub pull, flagged inline in §5. The HubSpot inventory gap (`[NEEDS YED-37]`) is closed: Part C ran 2026-05-21 and is folded into §5. v1 folds in YED-41.

---

## TL;DR

The NYC AI/tech event circuit is a high-density GTM signal source most pipelines ignore because they aggregate at the wrong layer (companies + attendance) instead of the right one (named individuals + drafted outreach). I built a 21-event corpus over 20 days as the data-foundation layer, then ran a modeling pass that revealed three load-bearing insights: (1) the *real* watchlist is the DM-draft list, not the recurring-attendee list; (2) the events I actually attend select for a different population (NYC AI ecosystem) than the canonical Clay-blog enterprise target list (≤15% overlap); (3) hygiene-tier-1 failures are concrete and measurable in the corpus today — 3 confirmed Companies duplicates and a 6-Event dangling-relation case. Phase 1 will operationalize this into 7 seed signals with a measurement layer before any new content skill ships.

---

## 1. Frame — Why events are a high-density GTM signal source

Most GTM signal layers look at firmographic + technographic state (funding stage, hiring momentum, tech-stack changes). These are *what* signals — they tell you a company is interesting. They don't tell you *which person is in the room right now* about to make a decision, what they're skeptical about, who's standing next to them, and what unspoken consensus is forming around a category.

Events are dense in the second kind of signal. In NYC AI specifically, every week has 3–7 events featuring named operators (founders, BizOps leaders, GTM engineers) who are actively triangulating on hard category questions in real time. Each event is:

- An attendance list (who showed up, what they care about)
- A speaker panel (whose POV is being amplified)
- A host (who's curating the room — themselves a signal of community status)
- A topic cluster (what categories are co-occurring)
- A *future* attendance forecast (what events host the same people)

Most signal pipelines miss this because they ingest at the company level. The data shape that captures events well is **multi-relational**: Events ↔ People ↔ Companies ↔ Topics ↔ Content Drafts, with relations dense and bidirectional. That's a graph problem, not a flat-table problem.

## 2. What got built — Events Pipeline as the rung-1 module

The Empire State Events Pipeline (companion repo) is a shipped data-foundation module that runs over Notion as the primary spine, with 6 data sources:

| Data source | Purpose | Rows (2026-05-20) |
|---|---|---|
| Events | Each event Alex tracks/attends | 21 |
| People | Named individuals (speakers, hosts, attendees) | ≥67 |
| Companies | Org records | ~70 |
| Topics | Category taxonomy | ~64 |
| Content Drafts | Research briefs, LinkedIn posts, DMs, prepared questions | ≥60 |
| Project Ideas | Build-merit-scored project candidates | 8 |

The pipeline is **already producing content** — 121 Content Draft relations across 21 events, including event-tethered LinkedIn posts (variants A/B), Sunday roundup posts spanning multiple events, prepared questions for attended events, and per-attendee DM drafts. Relation density averages 3.7 People + 3.3 Companies + 3.8 Topics + 5.8 Drafts per event, with heavyweight events like ERA30 Demo Day at 50+ relations.

The pipeline is the *foundation* the Signal Pipeline project (gtm-os, Project A) builds on. It is **not** being rebuilt — it is treated as a completed module, and Phase 0 of Signal Pipeline is exploration over its data, not reconstruction of it.

## 3. The modeling pass — DM watchlist, not co-attendance watchlist

The naive way to extract a "target list" from event data is to count entity recurrence: which people appear in the most events, which companies host or get hosted repeatedly. A 20-day corpus is too young for that to work well. Inventory `§4.1–4.3` confirms it:

- **People:** exactly 1 person (Iris ten Teije) appeared in 2 events. Everyone else, 1 event. There is no top-10.
- **Companies:** 4 names recur in 2 events each (Microsoft, Sky Valley, Betaworks, Zo Computer). Of those, Microsoft is a content-cycle artifact (two Tech Briefs that quarter), and the rest are venues / hub-organizations, not target operators.
- **Topics:** 6 topic IDs in 2 events each — mostly the agent-reliability and workflow-collapse threads.

The modeling pass shifted the aggregation surface to Content Drafts → People. Specifically the `linkedin_dm_*` subtype: each DM draft = one explicit act of "Alex chose to engage this person." Drafts are denser than co-attendance and carry intent.

**Result:** 24 named individuals + 17 implied companies (the orgs those individuals work at), derived from outreach intent. This is the actual revealed watchlist for the 20-day corpus. Highlights:

- **Shortlist NYC #4 (Apr 27)** — 8 DMs in one room including both hosts. The "application-only, every founder is hiring" event format is structurally optimized for outreach density.
- **EliseAI (Beyond the QBR, Apr 21)** — 5 DMs to one company. This is "evaluating EliseAI as employer" outreach, not lead-gen — a qualitatively different signal type that should be modeled separately.
- **2 anonymized DM placeholders** (`[Host]`, `[Speaker]`) — pre-publish slots that never got filled. Small process leak worth fixing.

**Anti-finding:** of the 7 Clay-blog target companies (Intercom, Canva, Notion, Anthropic, Ramp, Verkada, Rippling), the corpus intersects at 1 — Ramp, via the Alex Levinson DM at Data Driven NYC #121. Anthropic appears at Event level (`A Better Way to Build Agents`, Mark Nowicki + Maggie Russo speaking) but **no DM was drafted to either Anthropic person**. That's the highest-leverage outreach Alex didn't take in the corpus. Worth flagging as a class of mistake — not "we lack data," but "we had the data, didn't draft outreach."

## 4. What broke — Hygiene-tier-1 failures observed in real data

This section exists because hygiene is the part of GTM data work that everyone agrees matters and almost nobody documents until it bites them. The 20-day corpus produced 4 named failure modes already.

### 4.1 Within-event Companies duplicate
Entrepreneurs Roundtable Accelerator (ERA) appears with **two distinct Notion page IDs inside the same event's `Companies` relation** (ERA30 Demo Day). Both records, same name, side-by-side. Implication: the company-write path in the events pipeline is creating-by-default, not consulting `normalized_name` before creating. This is the strongest possible dedup signal — same skill run, same event, two records.

### 4.2 Across-event Companies duplicates
Betaworks (2 IDs, across ArtificialRuby.ai NYC + Software Is the New Media) and Zo Computer (2 IDs, across OpenClaw NYC Meetup + Shortlist NYC #4). Same failure mode; broader blast radius. Captured in the formal dedup audit (`Phase_0/dedup_audit.md`) with first-seen-rule canonical IDs locked in for the Phase 1 merge plan.

### 4.3 Dangling relations on soft-deleted records
Content Draft `347d3699-c2db-8147-95c5-cdec8e22d3b6` ("The Upcoming Week — Apr 20-23 sweep") was soft-deleted in Notion but is still relation-linked from **6 separate Events** (Vercel Workflows, FDE Panel, Microsoft Azure, ArtificialRuby.ai NYC, EliseAI Beyond the QBR, Microsoft Fabric). Notion soft-deletes the page but doesn't sweep inverse relations. The relation graph holds pointers to records that don't exist as live entities.

### 4.4 Schema-name drift across DBs
The Topics DB exposed the relation back to Content Drafts as `Linkedin Post Drafts` while every other DB used `Content Drafts` for the same logical relation. Silent, downstream-query-breaking. **Resolved 2026-05-20** via Notion DDL rename (YED-38). The case study is in the hygiene spec changelog.

These four cases are now canonical test cases for any Phase 1 hygiene-tier-1 implementation. If a dedup pass doesn't catch the 3 confirmed Companies pairs, it's not done. If a record-deletion path doesn't sweep inverse relations, it's not done.

## 5. What the data revealed — V0 watchlist + ecosystem asymmetry

The Phase 0 outputs converge on three load-bearing observations:

**Observation 1 — The watchlist is the DM list.** See §3. 24 named individuals + 17 implied companies. The list is *small enough to track manually*, which means it's a real watchlist, not a wishlist.

**Observation 2 — The NYC AI ecosystem is the actual target population.** Events Alex attends select for Vercel, FLORA, Cube, Datadog, Snowflake, EliseAI, Sky Valley, Betaworks, ERA, FirstMark — *not* the Clay-blog enterprise list. Two strategic responses are possible:
- (A) Expand the named-target list to absorb the NYC ecosystem as a parallel target tier (most likely correct — they're who's actually in the room and who actually hires GTM engineers).
- (B) Constrain attendance to events featuring named-list operators (likely wrong — would shrink the pipeline to a starvation diet).

Choosing A is implicit in the events-side of the project. The Hub project (Project B) should reflect this.

**Observation 3 — Hub-level signal matters at this corpus size.** Even with no recurring people, three venues (Betaworks, Zo Computer founder-orbit, Sky Valley) and one accelerator (ERA) recur as hosts/connectors. That's the V0 signal: *watch the hubs, not the names*. The "named individuals" watchlist becomes statistically meaningful only after another ~60 days of corpus.

**Engagement & funnel metrics:** `[NEEDS YED-41]` — LinkedIn Creator Hub data for last-90-day post performance, posts-to-DMs ratio, and engagement-vs-specificity correlation will populate `inventory_findings.md` §5 once collected. Expected to confirm: high-specificity (named-entity) posts outperform generic ones; event-tethered posts outperform standalone; the funnel denominator (posts → meaningful DMs) is the metric to track for R2.

**CRM-side coverage (Part C, resolved 2026-05-21).** HubSpot inventory ran via the Layer 2 Claude.ai connector against portal 245798280 — the env-var blocker turned out to be moot, since the pipeline never used the local Layer 1 server (see `inventory_findings.md` §C and `MCP_SETUP.md`). The CRM holds **132 Contacts, 109 Companies, 95 Notes** in a one-note-per-attendee pattern. Three findings bear on the signal layer:
- **The identity gap propagates rather than closing.** 72% of Contacts (95/132) have no email. The Notion People DB's weak email completeness flows straight into HubSpot with no enrichment step closing it — so email cannot be the join key for the bulk of the corpus. Any future Notion↔HubSpot↔Supabase workflow needs a fallback identity heuristic (LinkedIn URL + normalized name + company-domain), which makes it a hygiene-tier-1 requirement, not a nice-to-have.
- **Cross-system coverage is incomplete and measurable.** Sampling 5 events for Notion→HubSpot note coverage surfaced a clean example: ERA30 (the heaviest event in the corpus, 17 People relations in Notion) has only 2 Notes in HubSpot — a 15-person hole. The per-name "which V0 watchlist individuals also exist as HubSpot Contacts" audit — the join point this section was originally blocked on — is now *runnable*, but at a 72% no-email rate it needs the fallback join key above to be precise, so it's scoped to Phase 1.
- **The dedup failure modes are cross-system, not Notion-only.** Four confirmed Company duplicates in HubSpot (Betaworks, LangChain, Microsoft, Zo Computer) mirror the Notion-side §4.1 cases almost exactly, and Matt Turck appears as both a Company (personal-brand domain) and a Contact — the same person-as-company misclassification. The §4 hygiene work is therefore load-bearing on both data planes.

Full detail in `inventory_findings.md` §C.1–C.3; the four hygiene-relevant findings are logged in `02_hygiene_tier_1_spec.md` changelog (2026-05-21).

## 6. Where this points — Phase 1 scope

Phase 1 (Foundation + first modeling pass) is scoped as:

1. **Stand up the Supabase spine.** Notion stays as human workspace. Supabase becomes the analytical/relational spine. Entity-ID strategy decided at spine build.
2. **Implement hygiene tier 1.** All 4 named failure modes from §4 become test cases. The 3 dedup pairs from §4.1–4.2 are the regression tests. The dangling-relation sweep from §4.3 becomes an on-delete invariant.
3. **Ingest 2–3 of the 7 seed signals.** Seed list lives in `Phase_0/signal_seed_list.md`. The two highest-value low-cost signals at this corpus size are **event hosting** (free, real-time via Luma + partiful + Notion) and **talent-density event format** (heuristic — "application-only" + "every-founder-hiring" markers). These work *now* without waiting for more data.
4. **R2 dashboard live.** Measurement layer ships *before* the next content skill. Clay red-flag #4 (don't ship a 6th content surface before measurement exists) is the disqualifying constraint.

**Phase 1 will not ship:**
- New content skills (Clay red-flag #4)
- LinkedIn scraping (ethics rule)
- A 7-signal ingestion suite (over-scoped — pick 2–3, validate)
- Workflow runtime decision before Phase 1 needs are known (Vercel WDK is tabled)

**Phase 2** will be one narrow scored play with measurement built in. **Phase 3+** adds signals and activations one at a time, as the data justifies them.

---

## Closing — what this is evidence of

The portfolio framing matters: this is rung-1 (data foundation) + rung-2 (data modeling), the layers Clay's blog and the Pocus/Common Room writeups argue most GTM engineers skip on their way to flashy activations. The arc of this work — events pipeline ships, then sit on the data and figure out what it *is* before piling more on top — is the discipline the role requires. The opposite (build six content skills, then realize you don't measure anything and your watchlist is wishful) is the failure mode this project was set up to avoid.

The 21-event corpus is small. The methodology should generalize. The artifacts (`inventory_findings.md`, `signal_seed_list.md`, `02_hygiene_tier_1_spec.md`, `dedup_audit.md`, this writeup) are the deliverables — together they show the work, not just the result.

---

## Related artifacts

- `Phase_0/inventory_findings.md` — full Part A Notion inventory + Drafts-side aggregation (§4.4 is load-bearing)
- `Phase_0/signal_seed_list.md` — 7 seed signals chosen from 23 candidates, with detectability + cost analysis
- `Phase_0/02_hygiene_tier_1_spec.md` — living spec with changelog
- `Phase_0/dedup_audit.md` — formal dedup audit + Phase 1 merge plan
- `Phase_0/clay-play-patterns.md` — modeling vocabulary (Clay/Pocus/Common Room)
- Companion repo: Empire State Events Pipeline Take 3 (events pipeline canonical)
