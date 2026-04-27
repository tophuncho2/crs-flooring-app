# Sweep 3 — Cut-Log Data Layer Rebuild Report

**Date:** 2026-04-26
**Plan:** `~/.claude/plans/take-a-look-at-functional-falcon.md`
**Audit:** [docs/sweep-3-cut-log-data-audit.md](sweep-3-cut-log-data-audit.md)
**Sweep doc:** `docs/sweeps/alteration/3_data.md` (still empty placeholder; this report supersedes)
**Branch:** `staging`

## Headlines

- **Data layer rebuilt** to mirror the staged-inv shape and consume sweep-2's pure helpers cleanly.
- **`shared.ts` SELECT extended** with `cutLogNumber`, `finalCutSequence`, `isFinal`. `CutLogRowPayload` auto-updates.
- **Normalizer fixed** to (a) hydrate the 3 sweep-1 fields and (b) preserve `null` on `coverageCut` / `cost` / `freight` (sweep-2 domain shape `string | null`).
- **6 new read primitives** added to `read-repository.ts` for the worker-side flows: `listCutLogsForPendingSaveDiff`, `listCutLogsForFinalizeBatch`, `getCutLogForVoid`, `getCutLogsForFinalize`, `getInventoryParentContextForCutLogs`, `getMaxFinalCutSequenceForInventory`.
- **5 new write primitives** added to `write-repository.ts`: `markCutLogsForFinalize` (producer-side, mirrors `markStagedRowsForImport`), `markCutLogForVoid` (single-row variant), `applyCutLogPendingSaveDiff` (worker-side, mirrors `applyStagedInventoryRowsDiff`), `finalizeCutLogBatch` (cross-entity worker-side; loops over `nextFinalCutSequence` + `computeBeforeAfterForFinalize`), `applyVoidToCutLog` (thin pair to `markCutLogForVoid`).
- **`finalizeCutLogRecord` updated** to stamp `isFinal=true` + `finalCutSequence` (new input field).
- **`voidCutLogRecord` aligned to sweep-2 patch shape** — no longer touches `before`, `after`, `isWaste`, `workOrderId`, `workOrderItemId`. Just `cut="0"`, `coverageCut/cost/freight=null`, `void=true`, `status="VOID"`.
- **`updateCutLogPending` extended** with `cost`, `freight`, `isWaste` (matching sweep-2's `CUT_LOG_PENDING_USER_EDITABLE_FIELDS`).
- **Rule-1 cleanup:** removed pre-existing `assertCutLogLinkageSymmetry` and `assertCutLogVoidStatusConsistency` imports from the cut-log write-repo. The data layer now imports only pure domain helpers (`buildVoidedCutLogPatch`, `computeBeforeAfterForFinalize`, `nextFinalCutSequence`) and types — no `validate*` / `assert*` / `is*Blocked`. Use cases (sweep 4) take ownership of those checks.
- **Domain extension:** new `packages/domain/src/flooring/inventory/cut-logs/finalize-math.ts` with `computeBeforeAfterForFinalize`. Pure subtraction, throws on non-finite input. Lives in domain so the sequential before/after math has one source of truth and is reusable by tests.
- **Sweep-3 typecheck regressions: 0.** `@builders/db` clean; `@builders/domain` clean; all other workspaces unchanged.

## Typecheck error counts

| Workspace | Errors | Notes |
|---|---|---|
| @builders/domain | 0 | clean (after rebuilding dist for sweep-2 + sweep-3 changes) |
| @builders/db | 0 | clean (the workspace this sweep changes) |
| @builders/application | 0 | clean |
| @builders/lib | 0 | clean |
| @builders/relay | 0 | clean |
| @builders/worker | 0 | clean |
| @builders/web | 0 sweep-3-attributable | 3 pre-existing TS7006 implicit-any errors in `apps/web/modules/work-orders/record/panel/work-order-record-panel.tsx:539-542`, unchanged on HEAD |

**Total sweep-3 regressions: 0.**

## guard:prisma

Same state as after sweep 2: cut-log half clean, staged-inv `staged-inventory-rows/types.ts` sibling violation persists (out of scope for the cut-log alteration sweeps).

## Files changed

### Modified

- `packages/db/src/flooring/inventory/cut-logs/shared.ts` — `cutLogRowSelect` gained `cutLogNumber`, `isFinal`, `finalCutSequence`. `CutLogRowPayload` (inferred) auto-updates.
- `packages/db/src/flooring/inventory/cut-logs/read-repository.ts` — REWRITTEN. New `toDecimalStringOrNull` helper. Normalizer hydrates the 3 sweep-1 fields and preserves `null` on `coverageCut/cost/freight`. Added 6 worker-only read primitives.
- `packages/db/src/flooring/inventory/cut-logs/write-repository.ts` — REWRITTEN. Dropped `assertCutLogLinkageSymmetry` / `assertCutLogVoidStatusConsistency` imports (rule-1 cleanup). `FinalizeCutLogRecordInput` gained `finalCutSequence`. `UpdateCutLogPendingInput` gained `cost`/`freight`/`isWaste`. `voidCutLogRecord` patch slimmed to sweep-2 shape. Added 5 new write primitives + their input/result types.
- `packages/domain/src/flooring/inventory/cut-logs/index.ts` — barrel exports `finalize-math.js`.

### New

- `packages/domain/src/flooring/inventory/cut-logs/finalize-math.ts` — `computeBeforeAfterForFinalize({ startingStock, priorConsumed, cut })` → `{ before, after }` as two-decimal strings.

### Verified unchanged (no edits needed)

- `packages/db/src/flooring/inventory/write-repository.ts` — `updateInventoryTotalCutSum` signature is correct as-is. Sweep-4 use cases will call it after the sweep-3 data primitives return.
- `packages/db/src/queues/outbox-repository.ts` — generic, sweep-4 producers will use `createQueueOutboxEvent` with the cut-log payload schemas from `packages/domain/src/queue/`.
- `packages/db/src/client.ts` — `withDatabaseTransaction` is the tx helper sweep-4 use cases will compose.
- `packages/db/src/flooring/inventory/cut-logs/index.ts` — barrel re-exports `read-repository.js` + `write-repository.js`, so all new functions surface automatically.

## What's set up for sweep 4 (application use cases)

- **Producer use cases (3):**
  - Pending-save: validate diff via `validateCutLogsDiff` outside the lock (early-reject); inside `withDatabaseTransaction`, lock inventory FOR UPDATE, snapshot via `listCutLogsForPendingSaveDiff` + `getInventoryParentContextForCutLogs`, re-validate, stamp tempIds via `assignCutLogDiffIds`, write the outbox event using `pending-save-cut-log-batch` payload schema.
  - Finalize: validate via `validateCutLogFinalizeBatch`; inside tx + lock, call `markCutLogsForFinalize` (this sweep), write outbox event using `finalize-cut-log-batch` payload schema.
  - Void: validate via `validateCutLogVoidRequest`; inside tx + lock, call `markCutLogForVoid`, write outbox event using `void-cut-log` payload schema.
- **Consumer use cases (3, worker-side):**
  - Pending-save apply: parse payload via `parsePendingSaveCutLogBatchPayload`; inside tx + lock, validate via `validateCutLogsDiff` against fresh snapshot, call `applyCutLogPendingSaveDiff`, recompute `totalCutSum` via `computeTotalCutSum`, assert via `assertCutSumWithinStartingStock`, persist via `updateInventoryTotalCutSum`.
  - Finalize apply: parse via `parseFinalizeCutLogBatchPayload`; inside tx + lock, re-validate via `validateCutLogFinalizeBatch`, compute `priorConsumedFromExistingFinalCuts` from existing finalized rows, call `finalizeCutLogBatch`. (totalCutSum unchanged by finalize.)
  - Void apply: parse via `parseVoidCutLogPayload`; inside tx + lock, re-validate via `validateCutLogVoidRequest`, call `applyVoidToCutLog`, recompute `totalCutSum` via `computeTotalCutSum`, assert via `assertCutSumWithinStartingStock`, persist via `updateInventoryTotalCutSum`.
- **Sync link-edit use case (separate flow, no worker):** validate via `validateCutLogLinkUpdate`; inside tx (no lock needed — links don't touch totalCutSum), update the row with new `workOrderId` / `workOrderItemId`.

## Decisions baked in

1. **Data layer is rule-1 strict.** No `validate*` / `assert*` / `is*Blocked` imports. The five domain imports are: `buildVoidedCutLogPatch`, `computeBeforeAfterForFinalize`, `nextFinalCutSequence` (functions); `CutLogParentContext`, `CutLogRow`, `CutLogStatus`, `DiffExistingCutLogRow` (types). All pure or type-level.
2. **`finalizeCutLogBatch` is a cross-entity primitive lives in cut-logs/write-repo** (not in inventory's write-repo) since it primarily writes to `flooring_cut_log`. The companion `updateInventoryTotalCutSum` call is the use case's responsibility (totalCutSum is unchanged by finalize but the use case may still re-write defensively).
3. **`applyCutLogPendingSaveDiff` reload pattern** uses a single
   `listCutLogsByInventoryId(inventoryId, tx)` call. Mirrors
   `applyStagedInventoryRowsDiff` exactly. The earlier "accidental cycle"
   concern was based on a false premise — the cut-log write-repo already
   imports three other functions from the read-repo, so adding the
   listing function is the same import direction. Reload collapses from
   1 + N (findMany + N findUnique) down to 1 query.
4. **`finalizeCutLogBatch` sort order** is `cutLogNumber ASC` (single key
   — the column has a unique constraint, so no tiebreaker is needed).
   `cutLogNumber` is the user-visible identifier (CUT-0000001 format),
   so user-perceived selection order (rows 4, 7, 9 → seq N, N+1, N+2)
   aligns with the allocated `finalCutSequence`. `getCutLogsForFinalize`
   uses the same orderBy, so the in-memory re-sort is essentially
   defensive (no-op when rows arrive in order). User explicitly picked
   this over `createdAt ASC, id ASC` (createdAt can collide on bulk
   `createMany`) and over a payload-supplied user-selected order
   (overkill — adds a payload field for a UX nuance no one asked for,
   and breaks the "deterministic from inputs" property).
   - **Per-batch invariant the producer use case (sweep 4) must enforce
     before writing the outbox event:** if any in-batch cut would push
     the inventory's projected `totalCutSum` past `startingStock`, the
     producer must reject. For finalize, the projection is current
     `totalCutSum` (already counts pending non-void cuts), so the check
     usually passes — but it's a free guard against a stale snapshot
     and will catch any race that slipped past the diff validator. The
     check itself reuses sweep-2's `assertCutSumWithinStartingStock`;
     no data-layer change required for it.
5. **`markCutLogForVoid` eligibility WHERE clause** matches `canVoidCutLog`'s domain logic verbatim: `void=false AND status≠"QUEUED" AND (isFinal=true OR status="PENDING")`. Defense-in-depth against the use case missing the validator call.
6. **`createCutLogRecord` kept as a single-row primitive** even though pending-save uses bulk `applyCutLogPendingSaveDiff`. Useful for tests / future ad-hoc use cases. Same convention as staged-inv keeping `createStagedInventoryRecord` alongside `applyStagedInventoryRowsDiff`.

## Verification commands run

| Command | Result |
|---|---|
| `npm run build --workspace @builders/domain` | clean (after sweep-3 changes; required to refresh dist for db typecheck) |
| `npm run typecheck --workspace @builders/domain` | clean |
| `npm run typecheck --workspace @builders/db` | clean |
| `npm run typecheck --workspace @builders/application` | clean |
| `npm run typecheck --workspace @builders/lib` | clean |
| `npm run typecheck --workspace @builders/relay` | clean |
| `npm run typecheck --workspace @builders/worker` | clean |
| `npm run typecheck --workspace @builders/web` | 3 pre-existing failures (work-orders module), 0 sweep-3 regressions |
| `npm run guard:prisma` | cut-log half stays clean; staged-inv sibling persists (out of scope) |
| `rg "tx\\.flooringCutLog\\.\|prisma\\.flooringCutLog\\.\|client\\.flooringCutLog\\." packages apps` (excluding repo) | zero results — every cut-log mutation/read goes through the cut-log repo |
| `rg "totalCutSum" packages/db/src` | only in inventory/write-repository.ts (`updateInventoryTotalCutSum`) and a doc comment in cut-logs/write-repository.ts |
| `rg "from \"@builders/domain\"" packages/db/src/flooring/inventory/cut-logs/` | only pure-helper + type imports — no validators/asserters/blockers |

## Out of scope (next sweeps)

- **Sweep 4 (application):** the use-case orchestration described above. Will compose this sweep's data primitives + sweep-2's domain validators inside `withDatabaseTransaction` + parent inventory FOR UPDATE.
- **Sweep 5 (relay + worker + outbox topic registration):** three relay dispatchers, three worker handlers. **(Order corrected — relay/worker has to land before routes so producers don't write outbox events with no dispatcher.)**
- **Sweep 6 (API routes):** `POST /api/inventory/[id]/cut-logs/...` for queue-pending-save, queue-finalize, queue-void; separate sync route for link edits.
- **Sweep 7 (loaders):** inventory record-view loaders surfacing pending vs finalized splits + queued indicator + `finalCutSequence` ordering.
- **Sweep 8 (UI + controllers):** cut-logs section migration, selection state + finalize action, per-row void action, separate work-order-link controller.
- **Out-of-sweep cleanup:** `staged-inventory-rows/types.ts` Prisma import (apply same string-literal-union fix).

## Sweep checklist update

`docs/sweeps/alteration/3_data.md` is still an empty placeholder. This
report supersedes; the placeholder file can either be removed in a
follow-up commit or filled with a one-line "see
sweep-3-cut-log-data-rebuild-report.md" pointer.

## Domain + data review checklist (for the post-sweep-3 spin-back)

User said after this sweep we'd "spin back to confirm domain and data
layers are solid before creating use cases." Concrete items to review
together:

- **Domain (sweep 2):** all 9 cut-log files in `packages/domain/src/flooring/inventory/cut-logs/`, plus the 3 queue payloads in `packages/domain/src/queue/`. Plus the new `finalize-math.ts` from this sweep.
- **Data (sweep 3):** the 4 cut-log files in `packages/db/src/flooring/inventory/cut-logs/`. Plus the unchanged `updateInventoryTotalCutSum` primitive in inventory's write-repo.
- **Open questions resolved post-implementation (decisions baked into
  the code):**
  - **Q1 (reload pattern):** switched to single
    `listCutLogsByInventoryId(inventoryId, tx)` call — mirrors
    staged-inv exactly; no helper in `shared.ts` needed; the original
    "accidental cycle" comment was a false premise.
  - **Q2 (sort order):** switched to `cutLogNumber ASC` (single key,
    user-aligned identifier order). Producer use case (sweep 4) must
    additionally check `assertCutSumWithinStartingStock` before writing
    the outbox event so the request is rejected pre-dispatch if it
    would violate the invariant.
  - **Q3 (`priorConsumedFromExistingFinalCuts` ownership):** stays with
    the use case (current design). Keeps the data primitive
    deterministic from plain inputs and avoids a duplicate aggregate
    read — the use case already has the snapshot in memory for the
    invariant check.
