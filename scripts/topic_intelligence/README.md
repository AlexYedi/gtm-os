# Topic-Intelligence Modeling Layer — Slice 0 (YED-110)

The rung-2 modeling layer over the signal spine: a non-destructive `theme → topic`
taxonomy plus co-occurrence over the event graph. **Slice 0** proves the primitive
(a queryable topic-cluster) and the content thesis. Substrate tables (`topic_trend`,
`topic_pair_metric`), `pg_cron`, and the `signal_read` views are **Slice 1**.

**Spec:** `Phase_1/topic_intelligence_spec.md` · **Architecture:** `Phase_1/architecture.md` §0.6 (V2.2)

## What Slice 0 shipped

1. **Migration** `supabase/migrations/20260806055217_signal_06_topic_cluster.sql` —
   `signal.topic_cluster` (canonical theme dimension) + non-destructive `topics`
   membership columns (`cluster_id`, `cluster_assignment_confidence`, `cluster_assigned_by`).
   Reviewed by `cto-principal-architect` (GO-with-changes, folded in).
2. **Taxonomy** — 170 spine topics clustered on their Notion rich text into **30 canonical
   themes**. N=30 chosen from a 20/30/40 calibration report (intersection density **0.274**,
   the selective-middle band; largest theme 20.7%; independently recomputed from the raw
   co-occurrence edges). Under-merge bias: distinct theses (e.g. Agentic Commerce / x402 rails /
   A2A transactions) are kept as separate topics under one theme, never fused.
3. **Bootstrap write** — 30 `topic_cluster` rows + all 170 `topics.cluster_id` assignments,
   written over REST. DB-verified: 30 clusters, 170 assigned, 0 unassigned.
4. **Computation 1** — cluster-level co-occurrence (shared events); 119 intersecting theme-pairs.
   Top link: *AI-Native GTM & Revenue Agents × GTM Operating Model* (5 shared events).
5. **Content proof** — synthesis piece drafted to Notion Content Drafts (`needs_review`),
   validating that modeling over the graph yields a differentiated, specific POV.

## Files

| File | What |
|---|---|
| `bootstrap_clusters.py` | Idempotent REST writer: creates a manual `ingestion_run`, upserts 30 clusters, assigns 170 topics. **Dry-run by default; `--execute` to write.** Preflight refuses to run until `signal_06` is applied. |
| `taxonomy_candidates.json` | The 20/30/40 candidate taxonomies + per-target calibration + synonym flags. N=30 is the applied set. |
| `computation1_cooccurrence_n30.json` | The 119 cluster-pair co-occurrence result (Computation 1). |

## Reproduce

```bash
# 1. Apply the migration (Supabase SQL editor or `supabase db push`)
# 2. Write the taxonomy (needs SUPABASE_SPINE_* in repo-root .env):
python3 scripts/topic_intelligence/bootstrap_clusters.py            # dry-run
python3 scripts/topic_intelligence/bootstrap_clusters.py --execute  # write
```

## Not in Slice 0 (deliberate)

- **Synonym hard-merges** (6 flagged in `taxonomy_candidates.json`) — repoint `relations`,
  mildly destructive; run as a separate reviewed step.
- **Slice 1** — `topic_trend` + `topic_pair_metric` (signal_07), `pg_cron` nightly, `signal_read`
  views (public views **anon-grantable**, `v_bridge_people` suppression-gated), the R2 render in
  the Hub, and a GitHub Actions keep-awake heartbeat (free-tier auto-pause protection).
