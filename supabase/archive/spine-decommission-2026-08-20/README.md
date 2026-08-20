# Signal Spine Cold Export — 2026-08-20

Cold logical export of the redundant GTM signal spine ahead of pausing the
Supabase project under **Linear YED-135**.

- **Source project:** `abkvgihlbwfloentugtd` ("Signal_Pipeline_Analytical_Spine")
- **Schema:** `signal`
- **Export date:** 2026-08-20
- **Export method:** `select json_agg(t) from signal.<table> t;` per table, via the Supabase MCP `execute_sql` tool; each result written verbatim to `<table>.json`. Function definitions captured with `pg_get_functiondef`.

## Exported tables (row counts verified against live DB at export time)

| File | Rows | Type |
| --- | --- | --- |
| `topics.json` | 170 | **Curated / non-regenerable** — the curated topic set, the most valuable asset |
| `topic_cluster.json` | 30 | **Curated / non-regenerable** — curated clusters |
| `ingestion_run.json` | 30 | **Curated / non-regenerable** — provenance / run history |
| `topic_trend.json` | 576 | Regenerable — deterministic compute output |
| `topic_pair_metric.json` | 2005 | Regenerable — deterministic compute output |

Note: `ingestion_run` was originally counted at 19 rows; it exported at 30 because
the daily `pg_cron` "computed" runs have appended provenance rows since that count
was taken. The export reflects the live state at 2026-08-20.

### Regenerable vs. non-regenerable

- **Non-regenerable (curated):** `topics`, `topic_cluster`, `ingestion_run`. These
  are the human-curated assets and provenance history and cannot be recreated by
  re-running compute. Protect these.
- **Regenerable (deterministic):** `topic_trend` and `topic_pair_metric` are the
  deterministic outputs of `signal.compute_topic_intelligence` and could be
  recomputed from the curated inputs; they are archived here for completeness.

## Algorithm

`functions.sql` contains the full definition of every function in the `signal`
schema (1 function): **`signal.compute_topic_intelligence`** — the deterministic
compute that produces `topic_trend` and `topic_pair_metric`. No helper functions
exist in the schema.

## Empty tables (0 rows — recorded, not exported)

`entities`, `entity_external_ids`, `events`, `signals`, `relations`, `provenance`,
`conflict_log`, `suppression`, `source_state`.

## Restore note

This is a **logical JSON export** (belt-and-suspenders safety net). The live
project is being **paused, not deleted**, so the authoritative data still lives in
`abkvgihlbwfloentugtd` and can be restored simply by unpausing the project. If a
true rebuild is ever needed, load the curated tables (`topics`, `topic_cluster`,
`ingestion_run`) from these JSON files, then re-run `signal.compute_topic_intelligence`
(see `functions.sql`) to regenerate `topic_trend` and `topic_pair_metric`.
