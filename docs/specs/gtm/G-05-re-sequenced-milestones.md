# G-05 · Re-sequenced milestone plan M4–M6 (GTM)

**Repo:** gtm-os
**Status:** DRAFT — not the plan of record until Alex signs off (the PR carrying this spec is a draft).

## Product

The Sprint 2 milestone targets in `docs/THE_PLAN.md` (M4 W13–16 / M5 W17–20 / M6 W21–24, ANCHOR 2 ~2026-11-09) were orphaned by the 2026-09-24 target-role pivot and the 2026-10-30 three-track plan; no re-sequenced plan existed. gtm-os is Horizon 2, so its milestone plan must express that: no GTM build commitments while Empire runs through year-end, then the GTM build window in Q1 2027.

The re-sequenced plan (full detail in `docs/THE_PLAN.md` → "Re-sequenced milestone plan"):

- **M4 (now → 2026-12-31):** planning reset + opportunistic upkeep. Adopt the plan; G-04 truth pass opportunistically; University/cockpit slices opportune; orphaned roadmap issues (YED-55, YED-56) re-anchored or closed in Linear by Alex.
- **M5 (2027-01 → 2027-02):** the GTM flagship — warm-path finder + evals + CASE.md — replanned onto honest dates that supersede the blown 2026-10-30 target (0%). Start yields to the Jan 1 2027 offer push. Architecture review before any build.
- **M6 (2027-03-01 → 2027-03-31):** Capstone 2 — Event-Driven Outbound Engine — ships **whole** by 2027-03-31, aligned with the Empire Job-Search Engine target. Opens with the re-anchored YED-55 architecture review. Capstone 3 stays scope-only.

**Locked decisions carried (do not reopen):** Capstone 2 stays whole and ships Q1 2027 after the offer push; the retired signal spine is not a foundation for new work; gtm-os-hub consumes MI-graph signals only via the shared `signal_read` view contracts on its own Supabase learning plane.

## Technical

Docs-only: amend `docs/THE_PLAN.md` (amendment block, Current State refresh, re-sequenced M4–M6 section), refresh the `README.md` State block, and point `SESSION_BOOTSTRAP.md`'s current-task region at the live front. No code, no dependencies.

## Must not

Build against the retired spine · write to the MI graph from this repo · re-date Capstone 2 without Alex · touch the private/public doc wording (that is G-04's scope).

**Done when:** Alex signs off the draft PR; the re-sequenced plan becomes the plan of record in `docs/THE_PLAN.md`; the cross-repo spec index in Take_3 gains the G-05 row (Alex's call).
