# Phase 0 — Signal Seed List

> ### ⚠️ Amendment 2026-07-17 — post-ship taxonomy revision (read first)
> After shipping Signals 1 & 2 (YED-108, live), the taxonomy was revised against reality:
> - **Signals 1 & 2 — SHIPPED & LIVE** (452 signal rows in the spine).
> - **Signal 3 (talent-density) — DROPPED.** Luma exposes no room-composition data (paid + own-calendar-only API; no guest list; scraping banned), and the real constraint is room *access*, not *selection* — Alex is the human curator. Removes the `rss_luma` source contract.
> - **Signal 4 (same-day pairing) — DROPPED.** Volume too small; it's a special case of Signal 5 (a `same-day` filter over topic co-occurrence).
> - **Signal 5 (topic intersection) — ELEVATED & RE-SPEC'd** as the **topic-intelligence modeling layer** → **`Phase_1/topic_intelligence_spec.md`**.
> - Signals 6 & 7 (funnel outcomes) — unchanged.
>
> The Signal 3, 4, 5 sections below are kept for the record but are **superseded** by this amendment. Full rationale + doc changes: **`signal_seed_list_changelog.md`**.

**Status:** V0, 2026-04-29 (amended 2026-07-17 — see banner). **Marked V0-pending-more-data** per `01_signal_discovery_method.md` Key Judgment Call #1: the corpus is 20 days young (~21 events, ~26 DM drafts, 1 published content piece) — statistically thin for ground-truth precision claims. Treat ranks as directional; revise at Phase 1 midpoint when 60+ days of data exist.

**Inputs:**
- `Phase_0/inventory_findings.md` (counts, relation density, revealed-watchlist-via-DMs)
- `Phase_0/clay-play-patterns.md` (signal-anatomy vocabulary)
- `Phase_0/02_hygiene_tier_1_spec.md` (hygiene dependencies for each signal)

**Output:** 7 seed signals. The list is the input to Phase 1 ingestion design — and nothing else gets built.

**"Acted on" definition (used as ground truth in Step 3):** A Content Draft with `Content Status` ∈ {`scheduled`, `approved`, `published`} **OR** a `linkedin_dm_*` Content Draft (regardless of status — the act of drafting a personalized DM is the act). HubSpot Notes will be added once HubSpot Part C unblocks.

---

## Step 1 — Candidate enumeration (compressed)

Pulled from `01_signal_discovery_method.md` §Step 1 + extended with two candidates the inventory surfaced (#15 same-day cross-event pairing, #16 talent-density event format). Total candidates considered: 23.

| # | Candidate | Level |
|---|---|---|
| 1 | Funding round | Co |
| 2 | Exec hire / departure | Co |
| 3 | GTME / RevOps / Growth role posted | Co |
| 4 | Product launch (agentic-adjacent) | Co |
| 5 | Customer win / case study published | Co |
| 6 | Event hosting | Co |
| 7 | Public POV from company leadership | Co |
| 8 | Open-source release | Co |
| 9 | Person job change | Per |
| 10 | Promotion to a target role | Per |
| 11 | Public POV from named person on tracked topic | Per |
| 12 | Podcast appearance (named person) | Per |
| 13 | Engagement with Alex's content | Per |
| 14 | Shared event attendance (target × Alex) | Per |
| 15 | Same-day cross-event thesis pairing | Topic |
| 16 | Talent-density event format (application-only, every-founder-hiring) | Event |
| 17 | New entrant into a tracked topic | Topic |
| 18 | Velocity spike on a topic | Topic |
| 19 | Two tracked topics intersecting | Topic |
| 20 | Event attended → meaningful conversations count | Funnel |
| 21 | DM sent → reply received | Funnel |
| 22 | Content published → engagement received | Funnel |
| 23 | Company recurrence across attended events | Co |

---

## Step 2 — Per-signal availability check

| # | Candidate | Detectable? | Free? | Latency | Noise rate | Notes |
|---|---|---|---|---|---|---|
| 1 | Funding round | Yes | Crunchbase Basic / Google News RSS | 1–3 d | Low | Annual cadence per company; not a content trigger for Alex per Step 3 |
| 2 | Exec hire | Yes | LinkedIn (their own posts) / news / blog | 1–7 d | Med | "New hire" ≠ "GTM hire" — title taxonomy fuzzy |
| 3 | GTME role posted | Yes | LinkedIn Jobs RSS / company careers RSS | 1–2 d | Med | Title taxonomy fuzzy; "GTM Engineer" still emerging |
| 4 | Product launch | Yes | Company blog RSS / Google News | 1–7 d | Low-Med | Easy to over-fire on minor releases |
| 5 | Customer win | Partial | Company blog RSS / press release | Days–weeks | Med | Sample bias: published wins, not all wins |
| 6 | Event hosting | Yes | luma.com / partiful / company calendar / news | 1–14 d | Low | Strong for cohort-discovery |
| 7 | Public POV from co leadership | Partial | LinkedIn (no bulk API) / blog RSS | 1–7 d | Med | LinkedIn capture is the bottleneck — no scraping per ethics rule |
| 8 | Open-source release | Yes | GitHub Releases RSS | Real-time | Low | High-signal for engineering culture |
| 9 | Person job change | Limited | LinkedIn API (very limited) / news if notable | Variable | Med | No bulk tracking; capture via LinkedIn notification only |
| 10 | Promotion to target role | Limited | Same as 9 | Variable | Med | Same constraint |
| 11 | Public POV from named person | Partial | LinkedIn / Substack RSS / personal blog RSS | 1–7 d | Med | Per-person RSS capture is feasible at watchlist scale |
| 12 | Podcast appearance | Partial | Listen Notes / podcast RSS / Apple PCI feed | 7–30 d | Low | Transcripts deferred to Week 4+ per project brief |
| 13 | Engagement with Alex's content | Partial | Alex's own LI notifications + Creator Hub | Same-day | Low | Manual until LinkedIn Personal Data Export ingested |
| 14 | Shared event attendance | Yes | Notion Events DB (already running) | Real-time | Very Low | **Already operational via events pipeline** |
| 15 | Same-day cross-event pairing | Yes | Computed from Notion Events | Real-time | Low | Simple SQL: events with overlapping date+person/topic |
| 16 | Talent-density event format | Yes | luma.com / event-listing RSS / Notion Events | 1–14 d | Low | Format heuristic: "application-only" + "every-founder-hiring" markers |
| 17 | New entrant into topic | Yes | Topic relations on new Companies / People records | Real-time | Low | Free via existing pipeline |
| 18 | Topic velocity spike | Partial | Count of new event/draft relations per topic per week | Weekly | Low | Computed |
| 19 | Two topics intersecting | Yes | Cross-relation SQL on Topics | Real-time | Low-Med | Free; requires good Topic dedup (hygiene §1.3 synonym set) |
| 20 | Event → conversations | Manual | Alex's own notes + Granola transcripts | 1–7 d | Low | High effort to capture; but already partially done |
| 21 | DM → reply | Manual | LinkedIn DM history (Alex's) | 1–14 d | Low | Manual capture; HubSpot Notes once Part C lands |
| 22 | Content → engagement | Partial | LinkedIn Creator Hub | 1–7 d | Med | Part B + D inventory work |
| 23 | Company recurrence across events | Yes | Notion Events SQL | Real-time | Med | **Hygiene-dependent** — dup IDs (ERA/Betaworks/Zo) inflate or undercount |

**Drops (Detectable=No, Free=No, or budget-killer):**
- None outright eliminated by detectability/cost. All candidates are free + detectable at some level.

---

## Step 3 — Ground-truth check against Alex's acted-on history

**Acted-on universe:** 26 DM drafts (24 named, 2 placeholder) + 1 published Content Draft (the Apr 20-26 Sunday Roundup, no People relations). DMs are the dominant ground-truth signal. Each DM = "Alex consciously chose to draft personalized outreach to this person."

| # | Candidate | Times present in acted-on data | Times absent | Precision (ack: thin n) | Verdict |
|---|---|---|---|---|---|
| 14 | Shared event attendance | **26 / 26 DMs** | 0 | Very high (100%) | **KEEP — workhorse** |
| (sub) Speaker/host status at attended event | ~24 / 26 DMs | ~2 (incl. anonymized placeholders) | High (~92%) | **KEEP — workhorse** (tighter filter on #14) |
| 16 | Talent-density event format | 8 / 26 DMs (single event: Shortlist #4) | — | Format-conditional | **KEEP — workhorse** (when this format appears, DM density is 4-8×) |
| 23 | Company recurrence across events | 0 / 26 DMs (no DM target appears in 2+ events except Iris ten Teije) | — | Insufficient data | DEFER (will scale at 60-day mark) |
| 6 | Event hosting | 21 / 21 events were on luma/partiful/etc. | 0 | Tautological — this is how Alex finds events at all | **KEEP — discovery layer**, not engagement signal |
| 11 | Public POV from named person | ~3 / 26 DMs reference public posts (Avi's PromptEngine, Joe Reis's book, Palash Shah's Medium blog) | ~23 | Low (~12%) | DEFER — Alex's discovery is event-driven, not POV-driven |
| 7 | Public POV from co leadership | 0 / 26 traceable | — | None | DROP — not how Alex discovers |
| 1 | Funding round | 0 / 26 DMs triggered by funding (funding shows up in Research Briefs, not as a *trigger*) | 26 | None as trigger | DROP |
| 3 | GTME role posted | 0 | 26 | None | DROP for V0; revisit with explicit job-search signal layer |
| 9–10 | Job change / promotion | 0 / 26 | 26 | None | DROP |
| 4 | Product launch | ~5 / 26 (Cube product summit, LangChain Series B + NVIDIA, Vercel Workflows GA, etc. — but post-fact, in research briefs) | ~21 | Low as trigger | DEFER |
| 8 | Open-source release | 1 / 26 (Sky Valley's Intent Space ahead of hackathon) | 25 | Low | DEFER |
| 12 | Podcast appearance | 1 / 26 (Avi's Ruby AI Podcast cited in his record) | 25 | Low | DEFER (transcripts deferred per project brief) |
| 15 | Same-day cross-event pairing | Inferred high — every Sunday Roundup organizes by same-day pairing; multiple events explicitly cite same-day siblings (LangChain Apr 29 brief literally names Cube as same-day pair) | — | High structural use | **KEEP — novelty** |
| 19 | Two topics intersecting | Inferred high — research briefs explicitly name topic intersections ("orchestrator-first vs. emergent coordination" thread runs through 4 events this week) | — | High structural use | **KEEP — novelty / Topic-side** |
| 17 | New entrant into topic | Several new Companies created per event run | — | Low as trigger; high as observation | DEFER |
| 18 | Topic velocity spike | Computable but no historical use yet | — | Untested | DEFER |
| 20 | Event → conversations | Per-event success-signal sections in research briefs | — | Already informally tracked | **KEEP — own-funnel workhorse** |
| 21 | DM → reply | Not yet captured systematically | — | Untracked | **KEEP — own-funnel** (instrument first, model later) |
| 22 | Content → engagement | Not captured (Parts B + D pending) | — | Untracked | DEFER until Parts B + D run |
| 13 | Engagement with Alex's content | Not captured (same as 22) | — | Untracked | DEFER |
| 5 | Customer win | 0 / 26 | 26 | None | DROP |
| 2 | Exec hire | 0 / 26 | 26 | None | DROP |

**Hard rule applied:** every candidate with zero historical hits is DROPPED for Phase 1 ingestion (per method §142).

---

## Step 4 — The seed list (7 signals)

Selection meets the protocol's criteria:
- ≥3 high-precision workhorses ✓ (signals 1, 2, 3) *(2026-07-17: Signal 3 dropped; 1 & 2 shipped)*
- ≥1 novelty signal ✓ (signal 4 + signal 5) *(2026-07-17: Signal 4 dropped; Signal 5 elevated to the topic-intelligence layer)*
- ≥1 own-funnel signal ✓ (signal 6 + signal 7)
- ≤2 require new paid tooling ✓ (zero require it — all detectable with existing free / already-paid sources)
- ≥3 with detection latency under a week ✓ (signals 1, 2, 3, 4, 5, 6 all real-time or same-week)

---

## Signal 1 — Shared event attendance (target × Alex)

**One-sentence description:** A named person at a target-fit company is on the speaker/host/attendee list of an event Alex is registered for or has decided to attend.

**Trigger:** Notion Event record has `Event Status` ∈ {`intake`, `researched`, `content_drafted`, `attended`, `post_complete`} **AND** that event's `People` relation contains a person who is target-universe.

**Detection:** Notion Events DB (already operational via the events pipeline). Real-time. $0.

**Qualifier:** Person is target-universe = (a) appears in Alex's existing People DB **OR** (b) is named in event invite as speaker/host/panelist **OR** (c) is at a company in the implied-via-DM watchlist (§4.4 of inventory_findings.md). Minimum bar: at least one of these three.

**Derived attribute:** `dm_priority_score` per person × event ∈ {high, medium, low}. High = speaker/host of attended event. Medium = panelist or named attendee. Low = co-attendee inferred from RSVP list. Cardinality ≈ 5–20 person-event pairs/week. Freshness: refresh on event status change.

**Suppression:** [employer] employees (current_employer); active [employer] pipeline contacts (active_pipeline); anyone DM'd in last 14 days at any other event (`in_flight_activation` per hygiene §5.3); anyone on the opt-out list.

**Possible activations** (≤2):
1. Auto-draft a `linkedin_dm_*` Content Draft via the pre-event-content skill, with the person's research-brief context already inlined. Alex reviews, sends or kills.
2. Add the person to a "to-meet-in-person" tracker on the event record so the post-event capture skill can ask "did you meet them?" and close the loop.

**Historical precision in Alex's data:** **26 / 26 DM drafts** had this signal present (i.e., every DM Alex drafted was for someone at an event he was attending). Acknowledged caveat: corpus is 20 days young.

**Phase 1 priority:** **P0 workhorse.** This is the dominant signal and the one the events pipeline already produces de facto.

**Hygiene dependencies:**
- §1.1 person identity resolution (email_lower, linkedin_url_normalized) — required before "is this person target-universe" can be answered without ambiguity.
- §1.2 person-name normalization for the tertiary match.
- §5.2 day-1 suppression entries ([employer] current_employer, active_pipeline) — non-negotiable before this signal goes live.
- §5.3 `in_flight_activation` 14-day cooldown after DM sent.

---

## Signal 2 — Speaker/host status at attended event

**One-sentence description:** A target-universe person is named as speaker, panelist, or host of an event Alex is attending — strictly tighter than co-attendance.

**Trigger:** Same Event record + a People relation with `Role Context` ∈ {`speaker`, `host`, `panelist`}.

**Detection:** Same source as Signal 1 + the existing `Role Context` multi-select on People. Real-time. $0.

**Qualifier:** Identical to Signal 1 fit gate.

**Derived attribute:** `is_named_role` boolean + `role_type` enum on the person × event pair. Drives `dm_priority_score` to "high" in Signal 1's derived attribute.

**Suppression:** Same as Signal 1.

**Possible activations** (≤2):
1. Same as Signal 1, but DM template defaults to `linkedin_dm_speaker` or `linkedin_dm_host` content type (already exists in the schema).
2. Auto-create a Prepared Questions content draft for the speaker, anchored to their talk topic.

**Historical precision in Alex's data:** ~24 / 26 DMs (~92%) targeted a named speaker, host, or panelist. The 2 misses are the anonymized `[Host]` and `[Speaker]` placeholders that didn't get filled in.

**Phase 1 priority:** **P0 workhorse** — this is the tighter filter inside Signal 1 and runs on the same infrastructure.

**Hygiene dependencies:**
- §1.1 / §1.2 — same as Signal 1.
- §3.1 schema contract for Role Context (multi-select; need to enumerate the canonical set: speaker / host / panelist / attendee / sponsor / organizer / mentor).
- The placeholder-DM hygiene gap (2 `[Host]`/`[Speaker]` records) flagged in §4.4 of inventory_findings should be closed before this signal goes live, otherwise the precision number rots.

---

## Signal 3 — Talent-density event format

> **⛔ DROPPED (2026-07-17).** Luma's post-overhaul API is paid (Luma Plus) and scoped to your own calendars — no guest list, no public discovery; scraping is banned by the ethics rule. And it solves the wrong problem: a density *prediction* helps you *choose* rooms, but the constraint is *access*, and Alex is already the human event curator. Removes the `rss_luma` source contract. Detail below preserved for the record. See `signal_seed_list_changelog.md`.

**One-sentence description:** An event whose format is structurally optimized for operator/founder hiring conversations — application-only, every-founder-hiring, no-VC-pitch — produces 4–8× more DM-worthy targets per event than typical AI/tech events.

**Trigger:** New Event record where the description matches a format heuristic: contains markers like "application-only," "every founder is hiring," "operators," "no panels," "no pitches to VCs," "founder showcase," **OR** is hosted by a known talent-density host (Shortlist NYC, Next Wave NYC, EliseAI invite-only, Acacia Consulting hiring nights).

**Detection:** Event description text + host company. RSS via luma.com / partiful / company event pages. Free. Latency: 1–14 days ahead of event.

**Qualifier:** Event is in NYC (geographic) **AND** at least 4 named speakers/founders **AND** format heuristic match.

**Derived attribute:** `is_talent_density` boolean per event + `expected_dm_count` integer estimate (default 4–8 for matches, 1–2 otherwise). Drives event prioritization for attendance and pre-event prep budget.

**Suppression:** Events Alex has explicitly declined; events tagged `not_attending` (per the new Event Status enum value being added — hygiene Open Q #8).

**Possible activations** (≤2):
1. Auto-elevate to "P0 attend" tier in the weekly event-triage step.
2. Allocate the larger pre-event-content prep budget (8 DMs vs. 1–2) so the per-event content lift is anticipated, not last-minute.

**Historical precision in Alex's data:** 1 / 21 events matched the format heuristic (Shortlist NYC #4, Apr 27) and produced 8 DMs vs. the corpus median of 1 DM/event. Strong directional signal; tiny n. Beyond-the-QBR (EliseAI invite-only) is a partial second match (5 DMs) and would also likely be flagged by the heuristic with the right markers.

**Phase 1 priority:** **P0 workhorse** — directly drives the attendance prioritization decision, which compounds into every downstream signal.

**Hygiene dependencies:**
- §1.1 Event identity (event_slug + source_calendar_id).
- §3.3 event-source contract (luma RSS, partiful, etc.) — this is the second contract Phase 1 should write.
- A canonical list of "talent-density hosts" is itself a tier-1 reference dataset; small enough to maintain by hand at this stage.

---

## Signal 4 — Same-day cross-event thesis pairing

> **⛔ DROPPED (2026-07-17).** Same-day event volume is too small to justify a build, and it's a special case of Signal 5 — a `same-day` filter over topic co-occurrence, not a separate signal. If ever wanted, it's a one-line query against the topic-intelligence layer. Detail below preserved for the record.

**One-sentence description:** Two events on the same calendar day cover thematically opposed positions on the same architectural debate — a documentarian-mode setup that Alex's existing Sunday Roundup synthesis pattern already exploits.

**Trigger:** Two Notion Event records where `Event Date` falls on the same calendar day (UTC-aware) **AND** their `Topics` relations share at least one topic ID **AND** the topic in question has at least two distinct positions encoded in its current-events / opportunities / challenges fields.

**Detection:** SQL on existing Notion Events + Topics. Real-time. $0.

**Qualifier:** Both events are `attended` or `researched`-and-attending. At least one event has named speakers (Signal 2 hit). Topic must be one Alex has written about before (≥1 prior Content Draft on the topic).

**Derived attribute:** `pairing_id` per (event_a, event_b, shared_topic) tuple. Cardinality ≈ 1–3 per week. Freshness: real-time.

**Suppression:** Pairings already used in a published Sunday Roundup or pattern-synthesis post (suppress to avoid re-publishing the same pairing).

**Possible activations** (≤2):
1. Auto-prompt the `pattern-synthesis` skill at end-of-day post-event with the pairing pre-filled.
2. Add a same-day-pairing flag to the event record's Content Drafts header so Sunday Roundup synthesis doesn't have to re-discover it.

**Historical precision in Alex's data:** Inferred high. The Sunday Roundup for Apr 20-26 explicitly organized 7 events as same-day siblings (Mon=Workflows+FDE, Tue=GTM+Azure+Voice+EliseAI, Wed=ArtificialRuby, Thu=ERA30+OpenClaw). The LangChain Apr 29 research brief explicitly names Cube Summit (same day) as the orchestrator-vs-foundations counter-thesis. Pattern is structurally embedded in Alex's existing skills, not yet automated as a signal.

**Phase 1 priority:** **P1 novelty (one of the two novelty slots).**

**Hygiene dependencies:**
- §1.3 Topic synonym set — same-day pairings break if "Agentic AI" and "AI Agents" are stored as different topics with no synonym link.
- §4.2 multi-select / tag merge rules for Topics relations.

---

## Signal 5 — Two tracked topics intersecting  →  ELEVATED to the topic-intelligence modeling layer

> **↗ RE-SPEC'd (2026-07-17).** This was the wrong altitude — a discrete "two topics co-occur" signal. It has been elevated into the **topic-intelligence modeling layer** (a rung-2 modeling asset): a non-destructive `theme → topic` cluster taxonomy + three computations (co-occurrence, time-windowed trend, shared-speaker bridges) across all-time/month/week, producing differentiated **content** and relationship **targeting**. A discrete `signals` row of type `topic_intersection` still fires on threshold crossings. **Full spec: [`Phase_1/topic_intelligence_spec.md`](../Phase_1/topic_intelligence_spec.md).** The original V0 framing below is superseded.

**One-sentence description (original V0, superseded):** Two distinct topics in Alex's Topics DB suddenly co-occur on the same Event or Content Draft for the first time (or first time in 30+ days), surfacing an emergent thesis worth a synthesis post.

**Trigger:** A new Event or Content Draft is written with `Topics` relations linking 2+ topics that have not previously co-occurred (or have not co-occurred in last 30 days). Computed via SQL on the relation graph.

**Detection:** Notion Topics relation graph. Real-time. $0.

**Qualifier:** Both topics have at least 2 prior records each (avoid first-occurrence noise on freshly-created topics). Both topics appear in Alex's `roadmap-overlay.md` cross-map domains (when that doc lands — for now, all current Topics qualify).

**Derived attribute:** `topic_pair_first_seen_at` timestamp per pair. Freshness: real-time.

**Suppression:** Pairings already named in a published synthesis post (avoid re-publishing).

**Possible activations** (≤2):
1. Auto-flag in the next pattern-synthesis run as a candidate thesis.
2. Add the new pair to a "topics-intersecting watchlist" in the weekly Sunday Roundup intake.

**Historical precision in Alex's data:** Several inventory-surfaced pairings — orchestrator-first ↔ emergent-coordination (LangChain × Sky Valley, 2 events Apr 29-30); foundations ↔ operations (Cube × LangChain, same day); platform-absorbs-agents ↔ FDE-bespoke (Microsoft × Acacia, Apr 21). Three intersections in one week of data.

**Phase 1 priority:** **P2 experimental (the novelty experimental slot).** Lower than Signal 4 because the false-positive rate is unknown — many topic pairs co-occur trivially without producing thesis-grade content.

**Hygiene dependencies:**
- §1.3 Topic synonym set — high-stakes here. False intersections from un-deduped topics will dominate noise.
- §4.5 audit trail on Topics merges.

---

## Signal 6 — Event attended → meaningful conversations count

**One-sentence description:** For each event Alex actually attends, capture how many DM-worthy conversations actually happened in the room — closes the loop on Signal 3's `expected_dm_count` and Signal 1's `dm_priority_score` accuracy.

**Trigger:** Event status transition to `attended` or `post_complete`.

**Detection:** Manual entry by Alex (Notion field or post-event capture skill prompt) **OR** Granola transcript ingestion if the post-event coffee/conversation was recorded. Free (Granola already paid). 1–7 day latency.

**Qualifier:** Event was attended. Person met meets a "meaningful" bar: substantive conversation (≥3 min) OR explicit follow-up exchange (intro, scheduling, link shared).

**Derived attribute:** Per Event: `meaningful_conversation_count` integer + per-person `met_in_person` boolean on the People × Event relation. Cardinality ≈ 0–10 per event. Freshness: 1–7 d post-event.

**Suppression:** None (all signal data is useful here).

**Possible activations** (≤2):
1. Feed the actual count back into Signal 3's `expected_dm_count` calibration — Phase 2 modeling.
2. Flag people met in person but not yet in HubSpot for promotion to HubSpot Contact (per CLAUDE.md HubSpot scope rules).

**Historical precision in Alex's data:** Already partially captured in research briefs ("Success Signals" sections name conversation targets). Not yet structured as a queryable signal. Capture surface exists — instrumentation is the gap.

**Phase 1 priority:** **P0 own-funnel workhorse.** Without this, Signals 1–3 can't self-improve.

**Hygiene dependencies:**
- §2 source provenance — `met_in_person` field needs `last_verified_at` (was it verified on-site or remembered later?).
- §4.5 audit trail.

---

## Signal 7 — DM sent → reply received

**One-sentence description:** Track which DMs converted to replies vs. went unanswered — the truth-test for the entire watchlist + DM-prep stack.

**Trigger:** `linkedin_dm_*` Content Draft transitions to `Content Status = sent` (new status value to add) **OR** an Alex-recorded reply on the Draft.

**Detection:** Manual entry by Alex (the simplest version is two checkboxes on the Draft: `sent`, `replied`) **OR** future LinkedIn Personal Data Export ingestion. Free. Same-day to 14-day latency.

**Qualifier:** Draft is type `linkedin_dm_*`. Reply is from the targeted person (not a generic auto-reply).

**Derived attribute:** Per DM: `reply_status` ∈ {`pending`, `replied`, `no_reply_30d`, `bounced`}. Per Person: `dm_reply_rate` rolling. Per Event: `event_dm_conversion_rate`. Cardinality ≈ 5–10 DMs/week.

**Suppression:** None.

**Possible activations** (≤2):
1. After 30 days no-reply, auto-suppress that person from re-DM-targeting until Alex explicitly lifts (`opt_out`-adjacent suppression).
2. Roll up to per-event-format reply-rate to validate (or invalidate) Signal 3's talent-density premium.

**Historical precision in Alex's data:** **Untracked.** This is an instrument-first-then-model signal. Worth instrumenting in Phase 1 even with zero historical data because it's the only signal that closes the loop on whether the DM watchlist is actually working.

**Phase 1 priority:** **P1 own-funnel** — instrumentation in Phase 1, modeling deferred until ≥30 DMs are sent and tracked.

**Hygiene dependencies:**
- Add `sent` and `replied` fields to Content Drafts schema (or extend `Content Status` enum with `sent` + a separate `replied_at` date field).
- §4.5 audit trail — never lose the original reply text once captured.
- §5.2 suppression auto-add on `no_reply_30d`.

---

## Summary table

| # | Signal | Level | Priority | Detect latency | Historical precision | New paid tooling? |
|---|---|---|---|---|---|---|
| 1 | Shared event attendance | Per × Event | **P0 workhorse** | Real-time | 26/26 (very high) | No |
| 2 | Speaker/host status at attended event | Per × Event | **P0 workhorse** | Real-time | 24/26 (high) | No |
| 3 | ~~Talent-density event format~~ | Event | **⛔ DROPPED 2026-07-17** | — | — | — |
| 4 | ~~Same-day cross-event thesis pairing~~ | Topic × Event | **⛔ DROPPED 2026-07-17** (subsumed by 5) | — | — | — |
| 5 | Topic intersection → **topic-intelligence modeling layer** | Topic | **↗ ELEVATED** — see `Phase_1/topic_intelligence_spec.md` | Nightly (pg_cron) | Directional; canonicalization-gated | No |
| 6 | Event → meaningful conversations | Funnel | **P0 own-funnel** | 1–7 d post-event | Partially captured | No |
| 7 | DM → reply | Funnel | **P1 own-funnel (instrument)** | Same-day to 14 d | Untracked (instrument first) | No |

**Total new paid tooling required: $0.** All seven signals run on existing data sources + free RSS + manual capture. Honors the <$100/mo budget rule.

---

## What this seed list explicitly does NOT cover

Per the protocol's hard rule, signals with zero historical hits in Alex's acted-on data were dropped — even when they sound "obviously useful":

- **Funding rounds** — written about in Research Briefs as context, never as a *trigger* for Alex's outreach. (Drop is per-protocol; revisit if Alex's outreach pattern changes.)
- **Public POV from named person on tracked topic** — only ~3/26 DMs traceable to a public POV; Alex's discovery is event-driven, not POV-driven. Re-test after LinkedIn export ingested.
- **Job changes, promotions, exec hires, customer wins** — zero historical hits as triggers. Drop.
- **GTME role posted** — zero historical hits as triggers. Worth bringing back when an explicit job-search signal layer is scoped (separate workstream from this signal pipeline per project brief).
- **Engagement with Alex's content** — deferred until inventory Parts B + D are run (LinkedIn Creator Hub data).

These are the candidates worth re-testing **at the Phase 1 midpoint**, when the corpus is larger.

---

## Hygiene dependencies summary (cross-ref to `02_hygiene_tier_1_spec.md`)

Every signal above lists its individual hygiene dependencies. Aggregated:

- **§1.1 (entity identity keys):** required by signals 1, 2, 3, 6, 7 (all person/event signals)
- **§1.2 (normalization rules):** required by all signals that match on company name (3, 6, 7)
- **§1.3 (Topic synonym set):** **load-bearing for the topic-intelligence layer (elevated Signal 5)** — canonicalization is the make-or-break; without it, intersections fire on synonym noise. Now specced in `Phase_1/topic_intelligence_spec.md` §1.
- **§3.3 (source contracts):** events_pipeline (shipped). ~~`rss.luma`/`rss.partiful` (signal 3)~~ dropped 2026-07-17. Signal 5's topic-intelligence layer needs **no new source** — it computes over the existing graph (`Phase_1/topic_intelligence_spec.md`).
- **§4.5 (audit trail):** required by signals 6, 7
- **§5.2 (day-1 suppression):** **non-negotiable before signal 1 goes live** — [employer] employees + active [employer] pipeline
- **§5.3 (in_flight_activation 14-day cooldown):** required by signal 1's activation step
- **§ Open Q #7, #8, #9 (the hygiene gaps surfaced in this inventory):** schema-naming consistency (#7), `not_attending` enum (#8), dangling-relation cleanup (#9) — should be resolved before Phase 1 ingestion code runs against the existing corpus, otherwise the historical precision numbers rot

---

## What gets built in Phase 1 (preview, not commitment)

Given this seed list, Phase 1 ingestion design is constrained to:

1. The Notion Events DB as the canonical real-time signal source (already exists — Phase 1 wraps it in a contract, doesn't rebuild it). ✅ **SHIPPED (YED-108) — Signals 1 & 2 live.**
2. ~~RSS ingestion for luma.com / partiful (Signal 3)~~ — **DROPPED 2026-07-17** (Signal 3 gone; no `rss_luma` contract).
3. Internal computation jobs on the relation graph — **now the topic-intelligence modeling layer (elevated Signal 5); Signal 4 dropped.** See `Phase_1/topic_intelligence_spec.md`.
4. Schema extensions for own-funnel capture (Signals 6, 7 — `met_in_person`, `sent`, `replied_at`).
5. **Cleanup pass** on the hygiene gaps (#7, #8, #9 + the ERA / Betaworks / Zo Computer dup cases) — before any new ingestion writes against existing records.

Nothing else. No watchlist construction. No funding-round ingestion. No job-board scraping. No LinkedIn POV monitoring. Those are explicitly out of Phase 1 scope by virtue of failing the Step 3 ground-truth check.

---

## Revision policy

Per the method §187:
- **Quarterly default revision** — at end-of-quarter checkpoint or whenever the active project list shifts.
- **Mid-Phase-1 revision** — when first ingestion runs reveal a signal's actual noise rate diverges from the Step 2 estimate by >2×, or when ground-truth corpus crosses 60 days (≈100 DMs minimum).
- **Track all revisions in `signal_seed_list_changelog.md`** (created 2026-07-17 with the first revision — the Signals 3/4 drop + Signal 5 elevation).
