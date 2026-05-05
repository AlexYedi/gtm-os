# Phase 0 — Inventory Findings

**Run date:** 2026-04-29
**Protocol:** `Phase_0/00_data_inventory_protocol.md`
**Scope executed:** Part A (Notion inventory) — A.1–A.4
**Scope NOT executed:** Part B (LinkedIn post performance — Alex-led, manual), Part C (HubSpot inventory — BLOCKED, see §6), Part D (LinkedIn cadence baseline — Alex-led)

> **Methodology note (read first).** The Notion MCP available from Claude Code CLI exposes `notion-search` (paginated, max 25/call, no continuation cursor) and `notion-fetch` (page-level), but **no `query_data_sources` tool** for SQL-style enumeration. For row counts above 25 in any one query window, counts here are **lower bounds** triangulated by date-slicing + alternate-query-letter unions. Where a count is exact, it's marked ✓; where it's a lower bound, it's marked ≥. Property completeness (A.2) and relation density (A.3) are **sample-based** (1 page/DB for completeness; all 21 events for relation density). To upgrade to exact counts, run Part A in Claude.ai desktop where SQL queries against data sources are available, or expose `query_data_sources` via MCP.

---

## 1. Headline numbers

### 1.1 Row counts per Notion DB

| DB | Data source ID | Total rows | Created in last 30d | All rows in last 30d? |
|---|---|---|---|---|
| Events | `9dcbc999-b4ed-4a51-b48a-10aaf171f1ba` | 21 ✓ | 21 | Yes |
| People | `4a1af67f-9141-4ba5-aa9d-88b07dcd5f86` | ≥67 | ≥67 | Yes |
| Companies | `d5910dc3-8327-4b49-9294-fc9499709a98` | ≥55 | ≥55 | Yes |
| Topics | `d61ce9df-94b3-4637-aa09-d77e09ab3a74` | ≥58 | ≥58 | Yes |
| Content Drafts | `6c24c9f5-66c9-4eed-a61d-3f9b87c3f775` | ≥60 | ≥60 | Yes |
| Project Ideas | `0956e6ed-8555-4d8f-8856-388966dedaab` | 8 ✓ | 8 | Yes |

**Verification probe:** Date-range filter `2024-01-01 → 2026-04-01` on Events DB returned **0 rows**. Confirms the entire current corpus is post-2026-04-01. Earliest creation timestamps observed: 2026-04-09. The events pipeline has been running for ~20 days at the time of this inventory.

### 1.2 Property completeness (sampled, n=1/DB)

Completeness based on a single representative page per DB. Treat as directional, not statistical.

**People — Avi Flombaum (sampled):**
- Name ✓ · LinkedIn URL ✓ · Current Title ✓ · Role Context ✓ (`["speaker"]`) · Known POV / Bio ✓ · Last Researched 2026-04-19 ✓ (within 90d)
- Email **empty** ❌ · Phone Number empty ❌
- No `Companies` relation visible on the People schema returned (only `Events` and `Content Drafts`) — flag for hygiene check

**Companies — Anthropic (sampled):**
- Company Name ✓ · Description ✓ · Funding Stage ✓ · Industry / Space ✓ · Recent Developments ✓ · Recent Funding ($) ✓ · Website ✓ · Last Researched 2026-04-19 ✓
- Relations: 1 Event, 2 People

**Topics — Agentic AI (sampled):**
- Topic ✓ · Current Events ✓ · Challenges ✓ · Opportunities ✓ · Use Cases ✓ · Top Questions ✓ · Last Updated 2026-04-09 ✓ (within 45d)
- **Schema name surprise:** the relation to drafts is named `Linkedin Post Drafts` on this Topic, not `Content Drafts` as it appears on other DBs. Possible inconsistency vs. CLAUDE.md schema doc — verify in hygiene spec.

**Content Drafts — A Better Way to Build Agents (Variant A) (sampled):**
- Title ✓ · Content Status `scheduled` ✓ · Content Type `linkedin_post_pre` ✓ · Event Phase `pre_event` ✓ · Platform `linkedin` ✓
- Published URL **empty** (correct — only `published` status should fill this)
- Relations: 1 Event, 6 People, 4 Topics

**Project Ideas — eval-harness (sampled):**
- All scoring fields populated · Composite Score 8.5 ✓ · Stack Coverage % 70 ✓ (within 60–80% sweet spot) · Status `active` ✓
- Relations: 1 Event

### 1.3 Relation density (per event, n=21 — full population)

| Per-event averages | Total relations | Mean | Min | Max |
|---|---|---|---|---|
| People per Event | 77 | 3.67 | 0 | 17 (ERA30) |
| Companies per Event | 70 | 3.33 | 1 | 17 (ERA30) |
| Topics per Event | 79 | 3.76 | 1 | 6 (ERA30, FDE, Microsoft Fabric, …) |
| Content Drafts per Event | 121 | 5.76 | 1 | 12 (Shortlist #4) |

Two events have **0 People relations** (Microsoft Azure App Platform Tech Brief, Microsoft Fabric Tech Brief) — both are speakerless virtual broadcasts where this is correct by design (no named external speakers). Not orphans.

ERA30 is the heaviest event in every relation type — 17 People × 17 Companies × 6 Topics × 2 Drafts. The next-densest is Shortlist #4 (9 People × 8 Companies × 5 Topics × 12 Drafts).

---

## 2. What's healthier than expected

1. **Property completeness is high on the entity DBs.** Sampled People, Companies, Topics, and Content Drafts pages all had ~80–100% of the documented field surface filled, with substantive prose in narrative fields (Bio, Recent Developments, Current Events, Challenges, Opportunities). The skill outputs aren't just stub records — they're populated.
2. **`Last Researched` / `Last Updated` recency.** Sampled values fall inside the 90/60/45-day windows defined in the protocol. This signals the triage logic in `event-research` is firing on every run, not letting old records stale silently.
3. **Project Ideas DB has measured composite scores.** All sampled projects have `Composite Score`, `Stack Coverage %`, and constituent sub-scores set. `eval-harness` showed 70% stack coverage — squarely in the protocol's 60–80% sweet spot. The scoring discipline is operational.
4. **Cross-DB relations are dense, not sparse.** The avg event has ~3.7 People + 3.3 Companies + 3.8 Topics + 5.8 Drafts. Heavyweight events like ERA30 (50+ relations) and Shortlist #4 (34+) prove the pipeline is willing to build out the full graph, not minimum-viable.
5. **Content Drafts cover the full event lifecycle.** The 21 events generated 121 draft relations including Research Briefs, Pre-Event LinkedIn Posts (Variant A/B), Prepared Questions, and per-attendee DMs. This is rich content production already shipping.
6. **Cross-event Content Drafts work.** "The Upcoming Week" Sunday roundup posts (e.g., Apr 20–26, Apr 27–May 3) are linked to **multiple events** simultaneously, demonstrating the pipeline's ability to produce horizontal content artifacts that span events — a valuable pattern for the Hub work.

---

## 3. What's weaker than expected

### 3.1 Within-DB duplicates (hygiene-tier-1 issue, surfaced)

Confirmed duplicate entries with **different page IDs** for the same entity:

| Entity | DB | Distinct IDs | Where seen |
|---|---|---|---|
| Entrepreneurs Roundtable Accelerator (ERA) | Companies | `347d3699...8eb` + `347d3699...72d` | Both appear in **the same event** (ERA30 Companies relation) |
| Betaworks | Companies | `347d3699...72c` (Event: ArtificialRuby.ai) + `34ed3699...b9f` (Event: Software Is the New Media) | Across events |
| Zo Computer | Companies | `340d3699...089` (Event: OpenClaw NYC Meetup) + `34ed3699...d36` (Event: Shortlist #4) | Across events |

ERA appearing twice within one event's `Companies` relation is the strongest dedup signal — it means the skill that wrote the relation didn't check for an existing matching company name before creating. This is exactly the failure mode `02_hygiene_tier_1_spec.md §3.1` (Identity & Dedup) is written to prevent. **Add a changelog entry to the hygiene spec capturing these as concrete examples.**

### 3.2 Property gaps on identity-like fields (small sample)

Avi Flombaum's `Email` is empty despite a public LinkedIn URL and a known organizational role. Email enrichment is the kind of gap the events pipeline historically hasn't filled (research-time identifier focus, not ID-time identifier focus). Confirms the protocol's prediction that **identity fields are weaker than narrative fields** — and that's where dedup risk concentrates.

### 3.3 The corpus is too young to "let the data speak" the watchlist

The protocol's load-bearing A.4 output — the *revealed watchlist* — depends on entity recurrence across events. With only 21 events spanning 20 days, **almost no entity recurs**. See §4 below. The intended interpretation of "let your existing data reveal the watchlist" requires either (a) a longer time window with more cycles or (b) a different aggregation surface (Content Drafts → People is denser; ~121 draft-relations vs 77 event-people-relations).

### 3.4 Schema inconsistency surfaced

The Topics DB sampled (`Agentic AI`) has a relation property named `Linkedin Post Drafts` rather than `Content Drafts`. The same DB-to-DB relation appears under different names depending on the source DB. This may be intentional (display convenience), but it means downstream queries can't assume a single property name. Worth reconciling in the hygiene spec.

### 3.5a Soft-deleted Content Drafts still hold relations from Events

The Content Draft `347d3699-c2db-8147-95c5-cdec8e22d3b6` ("The Upcoming Week — NYC AI/Tech Sweep, Apr 20-23, 2026") is **soft-deleted** in Notion (returned with `<page url="..." deleted>` attribute on fetch) but is still listed as a `Content Drafts` relation by **6 separate Events** (Vercel Workflows, FDE Panel, Microsoft Azure, ArtificialRuby.ai NYC, EliseAI Beyond the QBR, Microsoft Fabric). The relation didn't get cleaned up when the draft was trashed.

**Implication:** The `Content Drafts` per-event count overstates by including dangling relations to deleted records. This is a tier-1 hygiene problem — the relation graph contains pointers to records that don't exist as live entities. Worth a lowercase-status scan to find any other deleted-but-still-relation-targeted records.

### 3.5b `[NOT ATTENDING]` event isn't soft-deleted, just renamed

`[NOT ATTENDING] Software Is the New Media` is still:
- Counted in the Events row count
- Linked to 4 People, 4 Companies, 4 Topics
- Linked from the `[ARCHIVED — NOT ATTENDING]` Research Brief draft

This is a soft-archive-by-title-prefix convention with no formal status column for "decided not to attend." Two consequences: (1) the `Sky Valley Ambient Computing` and `Iris ten Teije` records show as 2-event entities partly because of this not-attended event, slightly inflating their "recurrence." (2) Counts of "events Alex attended" diverge from "events in the DB" without a clean filter. **Consider adding a status option `not_attending` to `Event Status` enum** so this is queryable, not string-encoded in the title.

---

## 4. Revealed watchlist (A.4) — *with caveat*

> **Read with the caveat from §3.3.** A 21-event / 20-day corpus is too young to produce a stable watchlist by recurrence alone. The values below should be read as "first signal of recurrence" not "the watchlist." A fuller pass should re-run after ≥2 more months of pipeline output, or aggregate against Content Drafts (richer signal surface).

### 4.1 Top recurring People (by Event count)

Aggregation across all 21 events. **Iris ten Teije is the only person to appear in 2 events.** Every other named person appears in exactly 1 event. There is no top-10 at this stage — there's a top-1 and a long tail.

| Rank | Name | Event count | Events |
|---|---|---|---|
| 1 | Iris ten Teije (Sky Valley Ambient Computing) | 2 | Multi-Agent Hackathon · Software Is the New Media (NOT ATTENDING) |
| 2– | (everyone else) | 1 each | — |

**Read:** The pipeline hasn't run long enough to build a recurrence signal at the People level. To accelerate this, look at Content Drafts → People (Drafts are denser, especially "Upcoming Week" roundups).

### 4.2 Top recurring Companies (by Event count)

Aggregation across all 21 events, **with a name-based dedup pass** because of the duplicate IDs flagged in §3.1.

| Rank | Company | Event count | Events |
|---|---|---|---|
| 1 (tie) | Microsoft | 2 | Tech Brief Azure App Platform · Tech Brief Microsoft Fabric |
| 1 (tie) | Sky Valley Ambient Computing | 2 | Multi-Agent Hackathon · Software Is the New Media (NOT ATTENDING) |
| 1 (tie) | Betaworks (deduped across 2 IDs) | 2 | ArtificialRuby.ai NYC · Software Is the New Media (NOT ATTENDING) |
| 1 (tie) | Zo Computer (deduped across 2 IDs) | 2 | OpenClaw NYC Meetup · Shortlist NYC #4 |
| 5+ | (all other companies) | 1 each | — |

**Read:** Microsoft's recurrence is *category coverage* (two Tech Briefs in one quarter is a Microsoft-content-cycle artifact, not a signal Alex repeatedly chose them). Sky Valley + Betaworks + Zo Computer represent **NYC ecosystem hub effects**: Betaworks is hosting twice, Zo Computer shows up at adjacent founder/community events, Sky Valley's Iris is on a panel + a hackathon. *That's* the actual signal — the watchlist isn't named operators yet, it's named **venues and hub-organizations** with high through-flow.

### 4.3 Top recurring Topics (by Event count)

Six topic IDs recur in exactly 2 events; the rest are unique to a single event.

| Topic | Event count |
|---|---|
| Autonomous Agent Frameworks (OpenClaw) | 2 (OpenClaw Show and Tell · OpenClaw NYC Meetup) |
| AI Agent Reliability & Evaluation | 2 (LangChain Agent Improvement Loop · Snowflake AI Deep Dive) |
| Azure AI Foundry as Agentic Runtime | 2 (Azure App Platform · Microsoft Fabric) |
| Microsoft's AI Agent Factory Thesis | 2 (Azure App Platform · Microsoft Fabric) |
| Adaptive Software & Agent-Driven UIs | 2 (Multi-Agent Hackathon · Software Is the New Media) |
| Workflow Collapse — The 2026 GTM Pattern | 2 (Shortlist NYC #4 · Software Is the New Media) |

**Read:** Two themes echo across the corpus — **agent reliability/evaluation** (LangChain + Snowflake angle) and **the workflow/agent-coordination debate** (OpenClaw, Hackathon, GTM Pattern). These are the durable thematic seeds for signal-discovery in `01_signal_discovery_method.md`. The Microsoft topic recurrence is again a Microsoft-content-cycle artifact.

### 4.4 By-Content-Draft view — DRAFTS-DERIVED WATCHLIST

Drafts-side aggregation was run after the Events-side pass (added 2026-04-29). Three structural findings shifted what "the watchlist" means:

**a. Pre-Event Posts mirror their parent Event's People relations.** Sampled n=4 Pre-Event Posts (NYC Voice AI, Rebuilding GTM, Azure App Platform, A Better Way to Build Agents): each carried 0–6 People, identical or a subset of the linked Event's People list. So aggregating Drafts-by-Person mostly inflates absolute counts without changing the *ranking* established by Events-side aggregation. Pre-Event Posts are not the high-signal surface.

**b. Sunday Roundups carry zero People relations.** Sampled both ("Apr 20-26" published, "Apr 27-May 3" needs_review, plus the deleted "Apr 20-23" sweep). They carry many Event + Topic relations but **0 People** by design — they're event-level, not person-targeted posts.

**c. The DM drafts ARE the revealed watchlist.** Content type `linkedin_dm_speaker` / `linkedin_dm_host`. Each DM = 1 People relation = an explicit *Alex consciously chose to draft outreach to this person* signal. Sampled n=3 DMs (Akash Magoon, Alexandra Short, Palash Shah): each had multi-variant copy (Option A/B/C), specific personal hooks, and named research context — high effort per DM. This is qualitatively different from co-attendance.

**The 26 DM drafts (24 named, 2 anonymized) are the V0 outreach watchlist:**

| Source event | Named DM targets | Anonymized |
|---|---|---|
| Shortlist NYC #4 (Apr 27) | Akash Magoon, Andrew Yeung *[host]*, Andrew Pignanelli, Ben Guo, Regan Jayne, Brian Distelburger, Ivor Stratford *[host]*, Daniel Kahn (8) | — |
| EliseAI / Beyond the QBR (Apr 21) | Alexandra Short, Nick Maugeri, Molly Hatch, Maria Morin, Kuba Piwnik (5) | — |
| Cube Agentic Analytics Summit (Apr 29) | Joe Reis, Nnamdi Okike, Artyom Keydunov (3) | — |
| NYC Voice AI Meetup (Apr 21) | Sahar Mor, Bryce James, Hermes Frangoudis (3) | — |
| Data Driven NYC #121 (Apr 28) | Alex Levinson, David Yaffe (2) | — |
| LangChain Agent Improvement Loop (Apr 29) | Palash Shah (1) | — |
| Multi-Agent Hackathon (Apr 30) | Iris ten Teije (1) | — |
| Spec Coding (IBM, Apr 28) | Gil Isaacs (1) | — |
| Beyond the QBR | — | `[Host]` (1 placeholder) |
| Rebuilding GTM (HockeyStack, Apr 21) | — | `[Speaker]` (1 placeholder) |

**Read:**
1. **Shortlist #4 is Alex's outreach-density peak event** — 8 DMs in one room, including both hosts. The Shortlist format ("application-only, every founder is hiring") is structurally optimized for this kind of dense pre-event prep.
2. **EliseAI is the highest-density single-company DM cluster** — 5 DMs to one company in one event. This is "evaluating EliseAI as employer" outreach, not lead-gen.
3. **Two anonymized DMs** (`[Host]` for Beyond the QBR, `[Speaker]` for Rebuilding GTM) are pre-publish placeholders that didn't get filled in — small process / hygiene signal that the DM-completion step has a leak.

**Implied Companies watchlist (via DM-targeted individuals):** Adonis, EliseAI, Cube, Sky Valley Ambient Computing, Sparrow, Rediem, Zo Computer, Ramp Labs, Estuary, LangChain, IBM, Agora, 645 Ventures, The General Intelligence Company of New York, Windmill, Morpheus Talent Solutions, Fibe — **17 companies Alex actively chose to engage**, derived from outreach intent rather than co-attendance.

**Reconciling with Clay-blog 7 (Intercom, Canva, Notion, Anthropic, Ramp, Verkada, Rippling):**
- **Ramp is a direct hit** via Alex Levinson DM (DDNYC #121). The implied-via-DM watchlist intersects the Clay-blog list at exactly 1 of 7.
- **Anthropic** appears at the Event level (Mark Nowicki, Maggie Russo speakers at "A Better Way to Build Agents") but **no DM was drafted** to either Anthropic person — the highest-leverage potential outreach in the corpus that didn't happen. Worth flagging as a gap to fill.
- The other 5 Clay-blog targets (Intercom, Canva, Notion, Verkada, Rippling) are not in the corpus at all (Rippling appears once via Kamesh Vedula at the FDE panel — also not DM'd).

**Net interpretation:** The "let your existing data reveal the watchlist" question is answered. The watchlist IS the DM list — 24 named individuals + 17 companies — and it overlaps the Clay-blog list at <15%. That is the actual gap-to-bridge for signal discovery, not a counting problem.

### 4.5 Comparison vs. external watchlists

The protocol asked: how does this revealed watchlist overlap with the skills-map V1.1 named-operators list and the 7 Clay-blog companies? Brief read:

- **Anthropic** appears in the Companies DB (1 event: A Better Way to Build Agents) — the only Clay-blog company present. Notion, Intercom, Canva, Ramp, Verkada, Rippling are not yet present (Ramp shows up *via* Data Driven NYC #121 with Alex Levinson speaking — first appearance, doesn't reach the recurrence threshold).
- **Rippling** also has 1 event presence (FDE panel via Kamesh Vedula).
- The skills-map named-operators list isn't visibly present at recurrence-level either.

**Read:** The current event-driven corpus is mostly **NYC AI ecosystem** (Vercel, FLORA, Cube, Datadog, Snowflake, EliseAI, Sky Valley, Betaworks, ERA, FirstMark) — not the Clay-blog enterprise list. That asymmetry is itself worth noting in signal-discovery: the events Alex actually attends select for a different population than the named-targets list. *Either* the named-targets list needs to expand to include the NYC ecosystem, *or* the targeted attendance pattern needs to shift toward events featuring named-list operators.

---

## 5. Engagement patterns — PLACEHOLDER

> **This section is empty by design.** Parts B (content performance) and D (LinkedIn cadence baseline) require Alex's LinkedIn Creator Hub data and judgment on attributable DMs/conversations. They were explicitly out of scope for this MCP-driven run. Re-run protocol Parts B + D when ready and append findings here.

Targets for the placeholder once filled:
- Reactions / comments / DMs per published post (n=? from Content Drafts where Status=published)
- Whether named-entity specificity correlates with engagement
- Event-tethered vs. standalone post performance
- Posts → meaningful DMs ratio (the funnel denominator)
- Last-90-day cadence baseline (posts/week, longest gap, week-over-week variance)
- Attributable outcomes (warm intros, target-company connections, conversations)

---

## 6. Open questions surfaced

### 6.1 Blocked-on-config
1. **HubSpot MCP connection failed (401 Unauthorized).** No `.env` at `gtm-os/` root; `HUBSPOT_PRIVATE_APP_TOKEN` is unset. Part C (HubSpot inventory) is fully blocked. Resolution: create `gtm-os/.env` with the token from HubSpot → Settings → Integrations → Private Apps, then restart the session. Re-run Parts C.1 (object counts), C.2 (dedup audit), C.3 (event-association sample).

### 6.2 Methodology / tooling
2. **No `query_data_sources` tool exposed to Claude Code CLI.** Counts above 25 are lower-bounded via date-slicing + alternate-letter unions. Either expose a SQL-query tool via MCP or run Part A from Claude.ai desktop where the data source is queryable directly, to upgrade lower bounds to exact counts.
3. **`page_size` is hard-capped at 25 with no continuation cursor.** This is the binding constraint on enumeration via `notion-search`.

### 6.3 Data-shape
4. **Within-DB name-duplicate IDs in Companies (ERA, Betaworks, Zo Computer).** Confirms the hygiene-tier-1 dedup work is real work, not theoretical. Add to `02_hygiene_tier_1_spec.md` changelog as concrete cases.
5. **`Linkedin Post Drafts` vs `Content Drafts` relation-property naming inconsistency** between the Topics DB and other DBs. Reconcile or document.
6. **`[NOT ATTENDING]` events lack a status enum value** — soft-archived by title prefix. Adds noise to recurrence counts and pollutes downstream queries. Add `not_attending` to `Event Status`.
7. **People DB schema may not include a `Companies` relation** on individual records (Avi's page didn't surface one). Verify whether this is the schema or a sample artifact — if no inverse relation, going from a Person to "what company do they work at" requires reading the prose, not following a relation.

### 6.4 Strategy / scope
8. **The "revealed watchlist" interpretation question.** The 20-day corpus is too thin for People-level recurrence. Three resolution paths:
   - (a) **Wait + rerun.** Repeat A.4 after 2–3 more months of pipeline output.
   - (b) **Aggregate against Content Drafts instead of Events.** Drafts include DMs (explicit *Alex-acted-on* signal) and weekly roundups (cross-event spans). Higher signal density.
   - (c) **Accept the venue-level signal.** The Companies-level read in §4.2 (Betaworks, Zo Computer, Sky Valley as recurring nodes) is meaningful even at this corpus size — points to "watch the hubs, not the people" as the V0 signal-discovery hypothesis.
   Recommended: **(b) + (c) before (a)**. Don't wait for time; mine the existing draft corpus and accept hub-level signal as enough to seed Phase 1.

9. **NYC-ecosystem vs. Clay-blog-list mismatch (§4.5).** Worth an explicit decision before signal-discovery picks a watchlist anchor. Either expand the named-targets list to absorb the NYC ecosystem (likely correct), or constrain attendance to events featuring named-list operators (likely wrong — would shrink the pipeline).

### 6.5 Two suggested next investigations (per protocol §139 expectation)

1. **Run a Content-Drafts-side aggregation.** Fetch all ~60 drafts; aggregate `People` and `Companies` relations; produce top-10 People-by-Draft and Companies-by-Draft. Hypothesis: this surfaces the *real* revealed watchlist 5–10× faster than waiting for event recurrence — DMs make the "Alex acted on this person" signal explicit.
2. **Run dedup audit on Companies + Topics by lowercase-name match.** ERA's within-event duplication is the strongest hygiene flag. A lowercase-name-match scan across all ~55 companies and ~58 topics will surface every name-duplicate pair and is the cheapest way to size the dedup work for Phase 1.

---

## Appendix A — Data sources accessed

- **Notion MCP:** live, hosted at `https://mcp.notion.com/mcp`. All counts and relations sourced from `notion-search` and `notion-fetch` against the 6 documented data source IDs.
- **HubSpot MCP:** **dead, 401 Unauthorized** — `HUBSPOT_PRIVATE_APP_TOKEN` not set in environment. No HubSpot data accessed.
- **Other:** none.

## Appendix B — Sampled pages (full property dumps stored in session transcript)

- People: Avi Flombaum (`347d3699-c2db-8129-bab9-e234baddaf1f`)
- Companies: Anthropic (`347d3699-c2db-8156-8834-c21f31a78e6b`)
- Topics: Agentic AI (`33dd3699-c2db-813f-932d-c9e1cfbaee47`)
- Events: ERA30 Demo Day (`347d3699-c2db-81d5-afe3-f8eddfa73a8f`) + 20 others (full enumeration)
- Content Drafts: A Better Way to Build Agents Pre-Event Variant A (`347d3699-c2db-81ad-8ce1-e498130991e3`)
- Project Ideas: eval-harness (`348d3699-c2db-81b6-bf38-d4e360419c82`)
