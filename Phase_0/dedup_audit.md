# Phase 0 — Dedup Audit (Companies + Topics)

**Run date:** 2026-05-20
**Linear:** YED-39
**Inputs:** `Phase_0/inventory_findings.md` §3.1, §6.5 #2
**Status:** v0 — best-effort enumeration. See Coverage Caveat below.

---

## TL;DR

- **3 exact-name duplicate pairs confirmed** in Companies. Zero exact-name dups found in Topics within the enumeration sample.
- **5 Topic near-dup clusters** flagged for human judgment (not auto-merge candidates — likely intentional facets, but worth checking).
- **Merge plan:** 3 numbered merge actions ready for Phase 1 hygiene-tier-1 implementation. Canonical ID chosen by first-seen rule (oldest creation timestamp wins).
- **Coverage:** ~70 of an estimated ~75 Companies enumerated; ~64 of ≥58 Topics. The `notion-search` 25-result page cap and unreliable `created_date_range` filter make exhaustive enumeration without `query_data_sources` impractical. Confidence: 90% the 3 confirmed pairs are the only exact-name dups in Companies. Targeted "Betaworks" lookup recovered one entry the sweep missed, suggesting ~5–10 entries are still hidden.

---

## Methodology

1. Fetched data source schemas for Companies (`d5910dc3-8327-4b49-9294-fc9499709a98`) and Topics (`d61ce9df-94b3-4637-aa09-d77e09ab3a74`) via `notion-fetch` to confirm structure.
2. Ran `notion-search` with `content_search_mode=workspace_search` against each data source URL, partitioned by `created_date_range` filter into 3 buckets each:
   - 2026-04-01 → 2026-04-20
   - 2026-04-20 → 2026-05-01
   - 2026-05-01 → 2026-05-21
3. Deduplicated returned page IDs across all queries.
4. Grouped surviving entries by `lower(trim(title))`.
5. Flagged any lowercase-name group with >1 distinct page ID.
6. Verified `Betaworks` dup via a targeted name query — surfaced one Company entry (`Sublayer`) that none of the date-bucket sweeps returned. Confirms the sweep is non-exhaustive.

**Tool constraint:** `notion-search` has a hard `page_size=25` cap with no continuation cursor. The `created_date_range` filter appears to not strictly filter on Notion's `createdTime` — multiple results showed `timestamp` values outside the requested window (likely the filter is on a different date field or the timestamp returned is `lastEditedTime`). The combination means exhaustive enumeration requires either (a) `query_data_sources` MCP exposure, or (b) per-letter / per-title-prefix sweep on the order of 30–50 calls.

---

## Confirmed duplicates — Companies

### 1. Entrepreneurs Roundtable Accelerator (ERA)

| ID | First-seen timestamp | Status |
|---|---|---|
| `347d3699-c2db-81e0-b360-e4be02ba572d` | 2026-04-19 09:11 | **Canonical** (older) |
| `347d3699-c2db-816a-89a0-eb1e8453a23c` | 2026-04-19 09:35 | Merge into canonical |

**Failure mode:** Within-event duplicate. Both IDs appear in the ERA30 Demo Day event's `Companies` relation. The skill that wrote the second record didn't check for an existing name match before creating. Strongest hygiene-tier-1 signal in the corpus.

### 2. Betaworks

| ID | First-seen timestamp | Status |
|---|---|---|
| `347d3699-c2db-8173-a42c-f823e6ff1e72` | 2026-04-19 09:11 | **Canonical** (older) |
| `34ed3699-c2db-814b-9f59-f6e9b6571351` | 2026-04-26 19:10 | Merge into canonical |

**Failure mode:** Across-event duplicate. First instance linked to ArtificialRuby.ai NYC event; second to Software Is the New Media (`[NOT ATTENDING]`). Skill running on the second event didn't find the existing record.

### 3. Zo Computer

| ID | First-seen timestamp | Status |
|---|---|---|
| `340d3699-c2db-81ec-ba06-f6e6a4e10089` | 2026-04-12 16:35 | **Canonical** (older) |
| `34ed3699-c2db-817a-9d36-d40a6b40ad8f` | 2026-04-26 18:44 | Merge into canonical |

**Failure mode:** Across-event duplicate. First instance linked to OpenClaw NYC Meetup; second to Shortlist NYC #4. Same failure mode as Betaworks.

---

## Topic near-dup clusters (NOT auto-merge candidates)

No exact-name dups in Topics. These clusters are semantically adjacent and worth a human eye in Phase 1 — but all are plausibly distinct facets and should NOT be merged without checking the prose fields and downstream relations.

### Infrastructure / Local AI cluster
- `Local-First / Sovereign AI`
- `Personal & Local AI Infrastructure`
- `Self-Hosted AI Inference`
- `Custom AI Infrastructure in Regulated Environments`
- `Production Agentic Infrastructure`

The first two are the tightest pair — likely intentional facets ("sovereignty" vs "personal/local") but worth a one-record diff.

### Voice AI cluster
- `Real-Time Voice AI Infrastructure`
- `Voice as the Default Human-AI Interface`
- `Voice AI for B2B Outbound`
- `Conversational AI Design Patterns (Turn-Taking, Interruption, Latency)`

Four distinct angles. No merge needed; named differently on purpose.

### Memory / Context cluster
- `AI Agent Memory Layer`
- `Context Engineering`
- `LLM Knowledge Bases`

Three different aspects; all valid as distinct topics.

### API / Agent-API cluster
- `AI-Era API Security`
- `API Governance for Agentic Systems`
- `Agent-Ready APIs (OpenAPI for Agents)`

Three distinct framings.

### Coding-agent cluster
- `AI Coding Agents`
- `AI Coding Agent Infrastructure`
- `Spec-Driven Development with Agentic AI`

First two are the tightest pair — "Coding Agents" (about the agents themselves) vs "Coding Agent Infrastructure" (about what powers them). Defensible as distinct.

---

## Merge actions for Phase 1

Numbered list ready to feed `Phase_0/02_hygiene_tier_1_spec.md` Phase 1 work plan.

| # | DB | Canonical ID | Merge source ID | Action |
|---|---|---|---|---|
| 1 | Companies | `347d3699-c2db-81e0-b360-e4be02ba572d` (ERA) | `347d3699-c2db-816a-89a0-eb1e8453a23c` | Re-point ERA30 Demo Day's `Companies` relation; verify People/Events relations preserved on canonical; delete merge source |
| 2 | Companies | `347d3699-c2db-8173-a42c-f823e6ff1e72` (Betaworks) | `34ed3699-c2db-814b-9f59-f6e9b6571351` | Re-point Software Is the New Media's `Companies` relation; merge any unique prose-field content from source into canonical; delete merge source |
| 3 | Companies | `340d3699-c2db-81ec-ba06-f6e6a4e10089` (Zo Computer) | `34ed3699-c2db-817a-9d36-d40a6b40ad8f` | Re-point Shortlist NYC #4's `Companies` relation; merge any unique prose-field content; delete merge source |

**Pre-merge checklist (each one):**
- Fetch both records full content.
- Diff `Description`, `Recent Developments`, `Recent Funding ($)`, `Industry / Space`, `Funding Stage`, `Website`, `Last Researched`.
- If divergent, merge fields into canonical (richer record wins per field, not per record).
- Union the `People` and `Events` relations on canonical.
- Trash the merge source.

---

## Out of scope (for Phase 1 spec)

1. **Per-letter exhaustive enumeration.** ~30 additional `notion-search` calls would push coverage to ~99%. Not done here; would burn tokens for marginal find. If `query_data_sources` becomes available, re-run as exhaustive pass.
2. **Doing the merges.** This audit is sizing only.
3. **Topic near-dup field comparison.** Five clusters flagged; deciding which (if any) to merge needs a prose-field read on each candidate, plus a decision on whether facet-level vs concept-level taxonomy is correct. Sequenced for Phase 1 hygiene-tier-1 work plan, not now.
4. **People DB.** Not in scope of this issue. People DB had ≥67 records at inventory; deserves its own pass — flag for follow-up issue.

---

## Appendix A — Companies enumerated (70 unique)

ERA #1 and ERA #2 = same name, different IDs (see §1 above). Same for Betaworks and Zo Computer.

```
1. 4Wall Entertainment                       340d3699-c2db-814f-8216-f49b5d65961a
2. 645 Ventures                              34ed3699-c2db-815f-b47a-d1da0d803368
3. Acacia Consulting                         347d3699-c2db-818a-a325-c06cc5777252
4. Adonis                                    34ed3699-c2db-81d9-985f-feebcd3a6adc
5. Aerium                                    347d3699-c2db-81d3-a8fd-e6ee27b97364
6. Agentics NYC                              357d3699-c2db-81d4-9c54-fd4accd5080d
7. Agora                                     347d3699-c2db-8149-b796-e8367deff9ab
8. Anthropic                                 347d3699-c2db-8156-8834-c21f31a78e6b
9. Apidays                                   35dd3699-c2db-81fe-8406-f229213e6c3a
10. Astute Labs                              347d3699-c2db-81e5-b476-d0eeae03b3f7
11. Betaworks #1 (canonical)                 347d3699-c2db-8173-a42c-f823e6ff1e72
12. Betaworks #2 (merge)                     34ed3699-c2db-814b-9f59-f6e9b6571351
13. Bond AI                                  347d3699-c2db-810f-b7cc-c570fffe75ce
14. Braintrust                               358d3699-c2db-8116-a284-e6fbdd2ee5ae
15. CMI Media Group                          35dd3699-c2db-81bd-9b7f-fd47d6ca5550
16. Cake Wallet                              347d3699-c2db-8122-973e-cfff24764da8
17. Checkmarx                                35dd3699-c2db-81ce-a51d-dad1c4523c2f
18. Claer AI                                 347d3699-c2db-8112-8179-dfe4f6122da8
19. Closai                                   347d3699-c2db-8168-9b03-d7947b4927c3
20. Cognee                                   357d3699-c2db-8119-acd9-d3b9e7264bc5
21. Cube (Cube Dev)                          34ed3699-c2db-812c-a5d4-ec2982f49516
22. DataStax                                 350d3699-c2db-81ec-a9cd-f1fed2b59780
23. Discernis                                347d3699-c2db-8160-a2f7-f2a387dfad9b
24. ERA #1 (canonical)                       347d3699-c2db-81e0-b360-e4be02ba572d
25. ERA #2 (merge)                           347d3699-c2db-816a-89a0-eb1e8453a23c
26. Estuary                                  34fd3699-c2db-8102-bb54-d5cdba57c512
27. Every                                    34ed3699-c2db-81f3-a9bb-dd5813b18a73
28. FLORA                                    347d3699-c2db-8195-96ca-f63d8b33b569
29. Fibe                                     34ed3699-c2db-8124-9955-c1bc34d8678c
30. FirstMark Capital                        34fd3699-c2db-816b-bcbd-e1f7977aea0c
31. Harness                                  35dd3699-c2db-81f0-b27f-e3550c6f746c
32. Headway                                  35dd3699-c2db-818c-9c50-ca12a343be68
33. IBM                                      350d3699-c2db-8108-ab72-fdf689c3912b
34. Kong                                     35dd3699-c2db-8174-bce0-dd0e82a65519
35. LangChain                                348d3699-c2db-814c-a1ac-e57437d2488c
36. Microsoft                                347d3699-c2db-8130-a338-da1fdaa0abd1
37. Mintlify                                 35dd3699-c2db-8176-8da8-d3cf612036ad
38. Modal Labs                               357d3699-c2db-8164-837e-ebdb9f254bbf
39. Morpheus Talent Solutions                34ed3699-c2db-81e7-b710-d47210354bf9
40. Naftiko                                  35dd3699-c2db-81df-8cd7-d68bcca1ab7a
41. NumFOCUS                                 35dd3699-c2db-8144-8f32-caa4009c3091
42. ODSC AI                                  357d3699-c2db-81e8-a1f9-c934ceec496e
43. Omnicell                                 35dd3699-c2db-8180-a4d2-e7c3e0d6ce52
44. Pandium                                  35dd3699-c2db-81d7-9988-c876fa1fc358
45. Parrot Content                           347d3699-c2db-812e-a221-e4656a8ee84d
46. Petfolk                                  35dd3699-c2db-8186-972a-cfd3abe644d1
47. Platformable                             35dd3699-c2db-81bb-8fac-df2e7ce9a1e7
48. Postman                                  35dd3699-c2db-811e-b632-dc4c459e1272
49. PowerFlex                                35dd3699-c2db-81d7-93e3-e267f833bbbb
50. Quantuma                                 347d3699-c2db-81e3-861f-db062c06295b
51. Ramp                                     34fd3699-c2db-8147-9571-d3475331864c
52. Rediem                                   34ed3699-c2db-816f-9761-c4ce761fafd5
53. Remarkable Ventures Climate              347d3699-c2db-813e-be42-ea0d2bba2fa0
54. Revelo                                   35dd3699-c2db-81ae-9502-dc003cc9c9eb
55. Rokt                                     33dd3699-c2db-810a-a0a1-e171e5f479f1
56. SandboxAQ                                340d3699-c2db-81d9-80b8-db80caaa9914
57. Scaled Cognition                         347d3699-c2db-816b-93f8-ca7d8d85e552
58. Sky Valley Ambient Computing             34ed3699-c2db-816e-a172-cc20e5618ce8
59. Snowflake                                33dd3699-c2db-81c9-a571-dcf82b8fac61
60. Solo.io                                  35dd3699-c2db-81ca-8924-fecf246010f0
61. Sparrow                                  34ed3699-c2db-8172-9b80-ffb0368ad7c5
62. SpeedSize                                35dd3699-c2db-81b2-816f-ff3e6ffe4c13
63. Sublayer                                 347d3699-c2db-8108-acef-d83c84209cba
64. The AI Alliance                          35dd3699-c2db-81a7-8547-dc7dc1c85958
65. The Dispatch                             34ed3699-c2db-810c-a300-c196541f60be
66. The General Intelligence Company of NY   34ed3699-c2db-81bf-b57b-defdd40be03e
67. Tribute Labs                             34ed3699-c2db-815d-a6b8-e606c652a5e3
68. Vellum                                   357d3699-c2db-8122-87f6-c24a62d1b0f9
69. Windmill (Brian Distelburger)            34ed3699-c2db-8174-80a4-f8cdbdd32a26
70. Zo Computer #1 (canonical)               340d3699-c2db-81ec-ba06-f6e6a4e10089
71. Zo Computer #2 (merge)                   34ed3699-c2db-817a-9d36-d40a6b40ad8f
```

(71 rows listed — 3 are duplicate pairs, so 68 distinct companies.)

## Appendix B — Topics enumerated (64 unique)

```
1. Adaptive Software & Agent-Driven UIs             34ed3699-c2db-81c9-82f6-c5e1ce2c0b87
2. Accelerator Ecosystem Dynamics                   347d3699-c2db-8120-b8ae-f2cbf1f71fe1
3. Agent Architecture Patterns                      347d3699-c2db-81ea-bc19-c4a5e3275945
4. Agent Skills & Specialization                    340d3699-c2db-810f-9024-e0326c294efe
5. Agent-Ready APIs (OpenAPI for Agents)            35dd3699-c2db-8170-9376-d5bff35a92f4
6. Agentic AI                                       33dd3699-c2db-813f-932d-c9e1cfbaee47
7. Agentic AI Security                              347d3699-c2db-8134-b212-f67a822f3ca4
8. Agentic Analytics & The Semantic Layer           34ed3699-c2db-8178-94c1-db49155b1b46
9. Agentic Systems (FDE Lens)                       347d3699-c2db-81a9-a233-f6c5e7f11a41
10. AI Agent Memory Layer                           357d3699-c2db-8190-9d8a-c3c7ff914778
11. AI Agent Observability                          358d3699-c2db-811c-942e-c3a5f71d5e84
12. AI Agent Reliability & Evaluation               33dd3699-c2db-814e-b6b4-f6e5af2eb92b
13. AI Coding Agent Infrastructure                  357d3699-c2db-81ab-ad01-e01b8fa58b91
14. AI Coding Agents                                350d3699-c2db-81f0-9211-e80b8638e0ee
15. AI for HR & Performance Management              34ed3699-c2db-811d-b6f6-c4a6a28c570c
16. AI Harnesses & Agent Hooks for Codebases        347d3699-c2db-817e-b914-f3f367bea2d5
17. AI in Healthcare Revenue Cycle Management       34ed3699-c2db-812e-9c74-fd1ac94b0dd4
18. AI Media Compression for eCommerce              35dd3699-c2db-814e-a15a-cd1aad8aedef
19. AI Sales Coaches & Conversation Intelligence    357d3699-c2db-810b-acfc-c96db0229b31
20. AI SDR Hits & Misses                            357d3699-c2db-8153-9e4e-d6e6749f5ff0
21. AI x Media Convergence                          34ed3699-c2db-813f-af50-dcca4ff4629e
22. AI-Era API Security                             35dd3699-c2db-8123-9f08-c29d4c90a6e3
23. AI-Native Go-To-Market                          347d3699-c2db-8117-9484-e75dd2738fb3
24. AI-Native Vertical SaaS                         347d3699-c2db-814b-b438-ef8af2497043
25. AI-Ready Data                                   33dd3699-c2db-8101-9ae8-d00211f45a66
26. Apache Spark                                    33dd3699-c2db-8147-b3c8-cabea63fb178
27. API Governance for Agentic Systems              35dd3699-c2db-81d0-bc16-eeab9a9d0d81
28. Autonomous Agent Frameworks (OpenClaw)          340d3699-c2db-81aa-b599-c7e7facd3fd9
29. Cassandra / Astra DB Data Modeling for AI       350d3699-c2db-8178-92c4-d5969ea010ce
30. Claude Managed Agents                           347d3699-c2db-813a-a2ba-c707d844463d
31. Content & Brand AI                              347d3699-c2db-8125-9564-c9b09e570d40
32. Context Engineering                             35dd3699-c2db-8147-8e14-e7bd9a4d75e2
33. Conversational AI Design Patterns               347d3699-c2db-8129-b1f7-ddca01920ddf
34. CRM as System of Action                         357d3699-c2db-8191-aae8-e0dfce2e8c22
35. Custom AI Infra in Regulated Environments       35dd3699-c2db-819d-bd9f-c2e8069301b1
36. Data Cloud × Agentic AI                         357d3699-c2db-8112-90df-f1bb19a4b647
37. Data Foundations for AI Agents                  34ed3699-c2db-8183-8f48-cbe087984bfa
38. Durable Execution for AI Agents                 347d3699-c2db-810a-a2c2-e5d1e40cd17e
39. Engineering Leadership in the AI Era            35dd3699-c2db-81fb-adfd-f235cb9d2348
40. Hiring in AI-Era Engineering Orgs               35dd3699-c2db-81bc-a5be-eabe21ea9a1c
41. Independent Media Economics in the AI Era       34ed3699-c2db-815c-a8bd-c6a6b8eaea33
42. Legal & Compliance AI                           347d3699-c2db-819a-8f60-e428b4cde1b8
43. LLM Knowledge Bases                             35dd3699-c2db-81fa-8ae2-e77b86816f30
44. Local-First / Sovereign AI                      347d3699-c2db-8171-beae-e01cbb0cb400
45. MCP at Enterprise Scale                         35dd3699-c2db-816f-ad7f-c40b87232d9a
46. Microsoft's AI Agent Factory Thesis             347d3699-c2db-81b5-8a98-ef4a681cf3df
47. Multi-Agent Coordination Without Orchestrators  34ed3699-c2db-8198-ba8c-c33800fb5cab
48. Personal & Local AI Infrastructure              34ed3699-c2db-81b4-aeeb-e53c0c3250dc
49. Personalization at the Signal Layer             357d3699-c2db-8187-a7d1-f83bcbcaa521
50. Production Agentic Infrastructure               34fd3699-c2db-81f1-b3e5-f8361807161b
51. Programmatic Prompt Optimization (DSPy)         35dd3699-c2db-81d0-a4b5-ed6c71ecae30
52. RAG (Retrieval-Augmented Generation)            33dd3699-c2db-8197-913a-e53fe4e9d7ef
53. Real-Time Voice AI Infrastructure               347d3699-c2db-81fb-9c2b-c95b001e424b
54. Right-Time Data & The Modern Data Stack         34fd3699-c2db-8171-95b2-cde96991d0d9
55. Self-Hosted AI Inference                        35dd3699-c2db-81e4-bf63-c34b80487bdf
56. Spark Resource Optimization                     33dd3699-c2db-818d-8918-c3dbb97c4708
57. Spec-Driven Development with Agentic AI         350d3699-c2db-8126-9fe6-f57cc96e7f3a
58. The NYC AI Talent Layer                         34ed3699-c2db-8198-903d-dfbfeb6c891d
59. The NYC AI/Data Scene Gatekeeper Structure      34fd3699-c2db-810c-948d-dac4d9baf365
60. The SDR Role Reshape                            357d3699-c2db-8141-9a31-e447df1e99e9
61. Voice AI for B2B Outbound                       357d3699-c2db-8174-8dc7-c99570d16053
62. Voice as the Default Human-AI Interface         347d3699-c2db-8142-9283-f802b209d06f
63. VS Code as Agent-Native IDE                     347d3699-c2db-815f-ab60-dca000525c43
64. Workflow Collapse — The 2026 GTM Pattern        34ed3699-c2db-81a1-a956-fb86a7c55b3c
```

---

## Follow-ups

1. People DB dedup pass — not in scope here. Open as a new Linear issue post-Phase 0.
2. When `query_data_sources` MCP becomes available, re-run as an exhaustive sweep. Expected delta: ~5–10 additional Companies, ~0–3 additional Topics, possibly 1–2 more exact-name dups.
3. The dangling-relation issue (soft-deleted draft `347d3699-c2db-8147-95c5-cdec8e22d3b6` still referenced by 6 Events) is a separate hygiene-tier-1 case — captured in YED-40, not here.
