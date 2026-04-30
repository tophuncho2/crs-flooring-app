# Session 5 — Cut-Log Alteration End-to-End (Sweeps 1–7) Report

**Date:** 2026-04-25 → 2026-04-27
**Branch:** `staging`
**Sessions covered:** session-5 (this archive folder).
**Outcome:** the cut-log alteration's seven-sweep arc shipped end-to-end. UI is browser-reachable; pipeline is smoke-verified; one round of UX polish remains. See `cut-log-follow-ups-from-sweep-7.md` (root of `docs/`) for deferred items.

## What this session was

A vertical migration of `FlooringCutLog` to a worker-driven finalize / void / pending-save model that mirrors the staged-inventory import pipeline. The user drove the sweep cadence — each sweep audited, planned, executed, and reported in turn — with a checkpoint between domain (sweep 2) and data (sweep 3), and again between sweep 6 and the UI sweep.

## Sweep-by-sweep

| Sweep | Layer | Report |
|---|---|---|
| **1** | Schema — added `cutLogNumber` (CUT-0000001 sequence), `finalCutSequence`, `isFinal`; expanded `FlooringCutLogStatus` enum with `QUEUED`. Migration applied via `prisma migrate deploy`. | `sweep-1-cut-log-schema-alteration-report.md` |
| **2** | Domain — rebuilt `packages/domain/src/flooring/inventory/cut-logs/` to mirror staged-inv (lifecycle predicates, finalizability blocker, form rules, batch rules, void rules, link rules, diff types/rules/identity, cut-sum math, final-cut-sequence allocator, finalize-math). 3 queue payload schemas in `packages/domain/src/queue/`. | `sweep-2-cut-log-domain-rebuild-report.md` |
| **3** | Data — `packages/db/src/flooring/inventory/cut-logs/` repository: extended SELECT for sweep-1 fields, normalizer hydrates them, 6 worker-only read primitives, 5 write primitives (`markCutLogsForFinalize`, `markCutLogForVoid`, `applyCutLogPendingSaveDiff`, `finalizeCutLogBatch`, `applyVoidToCutLog`). Rule-1 cleanup: dropped throwing-rule imports. | `sweep-3-cut-log-data-rebuild-report.md` |
| **4** | Application — 7 use cases at `packages/application/src/flooring/inventory/cut-logs/`: 3 producer/consumer pairs (pending-save, finalize, void) + 1 sync link-edit. Producer-side `validateCutLogsDiff` includes the `totalCutSum ≤ startingStock` invariant check; consumer-side does drift detection inline (not validator re-call). | `sweep-4-cut-log-application-rebuild-report.md` |
| **5** | Relay + worker — 3 new relay dispatcher configs + 3 new worker handlers + 3 handler tests. Generic relay machinery (topic-dispatcher loop, BullBoard) untouched. End-to-end smoke run executed against real Railway Postgres + Redis with relay + worker as long-lived processes; **smoke PASSED on attempt 4** after fixing two real bugs (idempotency-key colon-count + worker-side validator over-rejection). | `sweep-5-cut-log-relay-worker-rebuild-report.md`, `smoke-test-cut-log-pipeline-report.md` |
| **6** | API routes — 4 cut-log routes under `apps/web/app/api/inventory/[id]/cut-logs/{section,finalize,void,links}` through the canonical mutation gauntlet (auth + rate limit + envelope + receipt + telemetry). | `sweep-6-cut-log-routes-rebuild-report.md` |
| **7** | UI section migration + controllers — extracted generic `useBatchSelectAction<TRow>` hook (canonical controllers folder); refactored staged-inv to use it (drops ~60 lines); rewrote cut-logs section controller wrapping `useRecordScopedSectionController` + `useBatchSelectAction`; rewrote section component at canonical `record/cut-logs/` path; shipped per-row `VoidCutLogButton` + `CutLogLinksEditor` (Clear-Links works; Set-Links picker deferred) outside the module dir per Option A. | `sweep-7-cut-log-ui-controllers-rebuild-report.md` |

## Cross-sweep extensions

Several small extensions landed during sweeps that nominally belonged to earlier sweeps:

| Sweep that shipped it | What | Why during this sweep |
|---|---|---|
| Sweep 3 | `computeBeforeAfterForFinalize` pure helper in domain | Data layer needed it; cleaner to ship alongside |
| Sweep 4 | Fixed sweep-2 `CutLogDraftPayload` missing `id` field | Caught while wiring the producer; retry idempotency would have broken |
| Sweep 4 | `updateCutLogLinks` data primitive | Sweep 3 missed it because pending-save doesn't carry links |
| Sweep 4 (post-approval patch) | `coverageCut` recompute via threading `coveragePerUnit` + `categorySlug` through `CutLogParentContext` | Initial impl had `coverageCut: null` placeholder |
| Sweep 6 | 2 new error codes (`CUT_LOG_VALIDATION_FAILED`, `CUT_LOG_DIFF_VALIDATION_FAILED`) on the `CutLogExecutionErrorCode` union | Routes' body validators throw these; mirrors staged-inv's pair |
| Post-sweep-5 | Worker `autorun: false` + explicit `worker.run()` | Cosmetic fix for the cold-start log race surfaced in the smoke |

## Real bugs caught + fixed (smoke + typecheck loop)

1. **BullMQ rejects custom jobIds with `:` unless they split into exactly 3 parts** (`node_modules/bullmq/.../job.js:1038`). Sweep 4's pending-save idempotency key was 11-part (timestamp's native colons + empty markers). Fixed in `save-cut-log-pending-diff.ts` by collapsing to 3 parts and using `-`/`_` inside.
2. **Worker consumers were re-running producer-side validators under the lock**, rejecting QUEUED rows (the very state the worker is supposed to handle). Fixed in `finalize-cut-logs.ts` and `void-cut-log.ts` by replacing the validator re-call with an inline drift check.
3. **ConfirmDialog API mismatch** — initial sweep-7 widget used `description` prop; actual prop is `message`. Fixed.
4. **`useBatchSelectAction` returning `ReadonlySet`** broke the staged-inv panel's `Set<string>` prop type. Loosened to `Set<string>`.
5. **Grid generics mismatch** between editable + read-only row types in the cut-logs section. Worked around by rendering read-only rows as an inline `<ul>`. Merge-back-into-Grid is a deferred follow-up.

## Sweep ordering correction (mid-arc)

The plan originally had sweep 5 = API routes and sweep 6 = relay/worker. We corrected mid-arc to **sweep 5 = relay/worker, sweep 6 = routes** because routes shipping before the relay/worker plumbing means producers write outbox events that sit in `PENDING` forever with no dispatcher. Reports + plan file + memory were updated.

Loaders (originally sweep 7) were folded into the UI sweep — `getInventoryDetailPageData` already returned `cutLogs`, so no separate loader sweep was needed.

## Final tally

- Schema migrations applied: 1 (`20260426204436_cut_log_finalize_status_alteration`).
- Files created across sweeps: ~40 (domain pure helpers, queue payloads, data primitives, use cases, dispatchers, processors, tests, routes, validators, UI components, widgets, drafts, mutations).
- Files modified across sweeps: ~15.
- Files deleted: 2 (sweep-2's `finalize-payload.ts` content relocated to queue/; sweep-7's Phase F cut-logs scaffold replaced by canonical-path component).
- Worker tests: 9 new (3 per consumer handler) + 3 existing materialize = 12 passing.
- End-to-end smoke: PASSED.
- Typecheck regressions across all sweeps: 0.

## What's left (deferred to follow-ups)

See `cut-log-follow-ups-from-sweep-7.md` at the root of `docs/`. Short version:

1. Set-Links picker UI (small sweep — work-order options loader + dependent dropdowns).
2. Read-only rows merged into a single canonical `Grid` (UX-polish).
3. Panel-local cutLogs ↔ controller record sync via `useEffect` (UX-polish).
4. Browser manual smoke pass after sweep 7 (user-driven validation).
5. The 57 pre-existing typecheck errors in unrelated modules (separate cleanup, owner TBD).
6. `staged-inventory-rows/types.ts` Prisma import cleanup (trivial — same fix as sweep 2).
7. DB CHECK constraint for linkage (deferred indefinitely; domain rule is sufficient).

The cut-log alteration's core architecture is shippable. Anything above is iteration on top.
