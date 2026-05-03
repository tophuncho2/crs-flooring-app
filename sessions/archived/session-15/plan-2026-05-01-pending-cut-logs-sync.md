# Plan — Pending Cut Logs: Sync Per-Row Use Cases

**Status:** Draft (awaiting approval)
**Date:** 2026-05-01
**Scope:** Pending cut logs only. Final cut logs / finalize worker / void flow are out of scope for this sweep (separate hardening pass later).
**Mirrors plan style of:** `sessions/plan-2026-05-01-finalize-cut-log-worker.md`

---

## Context

Today, every edit a user makes to the pending-cut-log set on a WOMI is batched into a `{ added[], modified[], deleted[] }` diff and persisted asynchronously via:
- `PATCH /api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/section` →
- producer use case (writes outbox event, flips WOMI to `SAVING_CUTS`, returns 202) →
- relay drains outbox → BullMQ job →
- consumer use case (locks inventories, applies the diff, recomputes `totalCutSum`).

That pipeline (the "Save Pending Cuts" / "Discard Pending Cuts" buttons + the worker behind them) is being replaced with three synchronous, per-row use cases — `create-pending-cut-log`, `update-pending-cut-log`, `delete-pending-cut-log` — each with its own API route. Each runs inside one DB transaction that locks the parent inventory `FOR UPDATE`, applies the row mutation, recomputes that inventory's `totalCutSum`, and asserts the `≤ startingStock` invariant.

After this sweep:
- **No worker, relay dispatcher, outbox topic, or queue exists for pending cut log mutations.** The finalize worker and the imports worker are unaffected.
- **The schema migration that adds `stockUnitAbbrev` / `stockUnitName` / `itemCoverageUnitAbbrev` / `itemCoverageUnitName` to `flooring_cut_log` (already merged: `20260501175827_add_cut_log_unit_snapshots`) is wired up.** These four columns are snapshotted from the parent inventory row at create time and are immutable thereafter (never touched by update, delete, or finalize paths).
- **WOMI status `SAVING_CUTS` is removed from the enum** (separate schema migration, first commit). Every pending mutation precondition reduces to `WOMI.status === 'IDLE'`.
- **Final cut logs cannot be deleted.** Pending only. Voiding remains the only mutation allowed against a final row, and is out of scope here.
- **Sequence count columns (`before`, `after`, `finalCutSequence`) are never written by these use cases** — the finalize worker owns them.
- **UI / controllers / hooks rework lands in a follow-up sweep.** That sweep will replace the section-wide Save/Discard buttons with row-level inline triggers (disabled until the row is dirty; clicking off any unsaved row auto-discards it).

This plan stops at the API. The UI/controller rework is described in Phase 7 for context but is explicitly the next sweep.

---

## Where cut log code lives today (current map)

| Layer | Location | Notes |
|---|---|---|
| Schema | `packages/db/prisma/schema.prisma` (`FlooringCutLog`, `FlooringInventory`) | Most recent migration `20260501175827_add_cut_log_unit_snapshots` adds four unit-snapshot cols. |
| Domain — inventory-rooted | `packages/domain/src/flooring/inventory/cut-logs/*` | Predicates (`cut-log-rules`, `editability`, `link-rules`, `void-rules`), math (`cut-sum-math`, `finalize-math`, `final-cut-sequence`), types, errors, diff helpers. |
| Domain — WO-rooted | `packages/domain/src/flooring/work-orders/cut-logs/*` | WO-scoped types + normalizers. |
| Domain — queue contract | `packages/domain/src/queue/save-work-order-item-pending-cut-log-diff.ts` | Topic, queue, job-name, payload schema for the pending diff worker. **DELETED in this sweep.** |
| Data — inventory-rooted | `packages/db/src/flooring/inventory/cut-logs/{read,write}-repository.ts` | Inventory-scoped reads/writes. |
| Data — WO-rooted | `packages/db/src/flooring/work-orders/cut-logs/{read,write}-repository.ts` | WO-scoped reads/writes (`applyWorkOrderItemCutLogPendingDiff` here). |
| Application | `packages/application/src/flooring/work-orders/cut-logs/{save,apply}-work-order-item-pending-cut-log-diff.ts` | Producer + consumer for the pending diff. **DELETED in this sweep.** |
| Outbox topic registry | `packages/domain/src/queue/save-work-order-item-pending-cut-log-diff.ts` | **DELETED.** |
| Relay dispatcher | `apps/relay/src/dispatch/build-save-work-order-item-pending-cut-log-dispatcher.ts` + registration in `dispatchers.ts` | **DELETED.** |
| Worker processor | `apps/worker/src/processors/save-work-order-item-pending-cut-log-diff.ts` + registration in `bootstrap.ts` (lines 105–183) | **DELETED.** |
| API route | `apps/web/app/api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/section/route.ts` | **DELETED, replaced with 3 routes.** |
| Validators | `apps/web/app/api/work-orders/_validators.ts` (`validateWorkOrderItemPendingCutLogDiffInput`) | Diff validator removed; 3 per-row validators added. |
| UI / controllers (deferred) | `apps/web/modules/work-orders/controllers/use-work-order-cut-log-section-state.ts`, `apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx`, `work-order-cut-log-row.tsx` | Save/Discard buttons + section-level dirty state. Deferred to next sweep. |

## Where the new code will live (target map)

```
packages/db/prisma/migrations/
├─ <timestamp>_drop_work_order_item_status_saving_cuts/migration.sql        (NEW — Phase 0)

packages/domain/src/flooring/inventory/cut-logs/
└─ pending-mutation-rules.ts                                                (NEW — predicates for per-row mutations)
   (existing files in this dir stay; coverage math, delete-allowed, etc. reused)

packages/domain/src/flooring/work-orders/cut-logs/
└─ types.ts                                                                  (UPDATED — add per-row input types)

packages/domain/src/queue/save-work-order-item-pending-cut-log-diff.ts       (DELETED)

packages/db/src/flooring/work-orders/cut-logs/write-repository.ts            (UPDATED)
   ├─ insertPendingCutLogRow              (NEW — also stamps unit snapshot from parent inventory)
   ├─ updatePendingCutLogRow              (NEW — never writes unit-snapshot, before/after, finalCutSequence, isFinal, void)
   ├─ deletePendingCutLogRow              (NEW)
   └─ applyWorkOrderItemCutLogPendingDiff (DELETED)

packages/db/src/flooring/work-orders/cut-logs/read-repository.ts             (UPDATED — add `getPendingCutLogForMutation` returning row + parent inventory row)

packages/application/src/flooring/work-orders/cut-logs/
├─ create-pending-cut-log.ts                                                 (NEW)
├─ update-pending-cut-log.ts                                                 (NEW)
├─ delete-pending-cut-log.ts                                                 (NEW)
├─ finalize-work-order-cut-log-batch.ts                                      (kept)
├─ apply-finalize-work-order-cut-log-batch.ts                                (kept — finalize worker)
├─ void-work-order-cut-log.ts                                                (kept)
├─ save-work-order-item-pending-cut-log-diff.ts                              (DELETED)
└─ apply-work-order-item-pending-cut-log-diff.ts                             (DELETED)

apps/relay/src/dispatch/
├─ build-save-work-order-item-pending-cut-log-dispatcher.ts                  (DELETED)
└─ dispatchers.ts                                                            (UPDATED — drop registration)

apps/worker/src/processors/
└─ save-work-order-item-pending-cut-log-diff.ts                              (DELETED)
apps/worker/src/bootstrap.ts                                                 (UPDATED — drop pending-diff queue + processor wiring)

apps/web/app/api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/
├─ route.ts                                                                  (NEW — POST creates one pending cut log)
├─ [cutLogId]/route.ts                                                       (NEW — PATCH updates, DELETE deletes)
└─ section/route.ts                                                          (DELETED)

apps/web/app/api/work-orders/_validators.ts                                  (UPDATED)
   ├─ validateCreatePendingCutLogInput                                       (NEW)
   ├─ validateUpdatePendingCutLogInput                                       (NEW)
   ├─ validateDeletePendingCutLogInput                                       (NEW)
   └─ validateWorkOrderItemPendingCutLogDiffInput                            (DELETED)
```

---

## Sweep phases (execution order — schema first per CLAUDE.md)

### Phase 0 — Schema (own commit)

Drop `SAVING_CUTS` from `FlooringWorkOrderItemStatus`. Pre-migration check: any rows currently `SAVING_CUTS` in production? The status is only ever held during a worker's TX, so steady state should be empty. The migration script does a defensive `UPDATE ... SET status='IDLE' WHERE status='SAVING_CUTS'` before swapping the enum.

- `packages/db/prisma/schema.prisma` — remove `SAVING_CUTS` from the enum literal list.
- New migration `<ts>_drop_work_order_item_status_saving_cuts/migration.sql`:
  ```sql
  UPDATE "flooring_work_order_item" SET "status" = 'IDLE' WHERE "status" = 'SAVING_CUTS';
  ALTER TYPE "FlooringWorkOrderItemStatus" RENAME TO "FlooringWorkOrderItemStatus_old";
  CREATE TYPE "FlooringWorkOrderItemStatus" AS ENUM ('IDLE','FINALIZING','FAILED');
  ALTER TABLE "flooring_work_order_item" ALTER COLUMN "status" TYPE "FlooringWorkOrderItemStatus" USING "status"::text::"FlooringWorkOrderItemStatus";
  DROP TYPE "FlooringWorkOrderItemStatus_old";
  ```
- Re-generate Prisma client (`pnpm db:generate` or equivalent).

**Commit message:** `schema: drop SAVING_CUTS from FlooringWorkOrderItemStatus`

### Phase 1 — Domain

- `packages/domain/src/flooring/inventory/cut-logs/pending-mutation-rules.ts` (NEW): two predicates.
  - `assertWorkOrderItemReadyForCutLogMutation(womi)` — `womi.status === 'IDLE'`, otherwise throw `WORK_ORDER_ITEM_NOT_IDLE` (409).
  - `assertCutLogPendingMutationAllowed(row)` — `row.status === 'PENDING' && !row.isFinal && !row.void`, otherwise throw `WORK_ORDER_CUT_LOG_NOT_PENDING` (409). Reuse `assertCutLogDeleteAllowed` semantics; this predicate is the union for update + delete.
  - `assertCutLogExpectedUpdatedAtMatches({ row, expected })` — throw `WORK_ORDER_CUT_LOG_STALE` (409) when `row.updatedAt.toISOString() !== expected`.
- `packages/domain/src/flooring/work-orders/cut-logs/types.ts` (UPDATED): add `CreatePendingCutLogInput`, `UpdatePendingCutLogInput`, `DeletePendingCutLogInput`, plus the per-row input types the validators map to.
- `packages/domain/src/queue/save-work-order-item-pending-cut-log-diff.ts` (DELETE): remove the topic, queue, job-name, and payload schema exports. Update `packages/domain/src/queue/index.ts` barrel.
- Reuses (no edits):
  - `assertCutLogLinkageSymmetry` — every input still carries `workOrderId` + `workOrderItemId`; assert once at the top of every use case.
  - `assertCutLogDeleteAllowed` — only PENDING rows are deletable (final cut logs cannot be deleted).
  - `computeCutCoverage` — coverage derivation for create + cut-changing update.
  - `assertCutSumWithinStartingStock` — invariant assertion after recompute.
- Removes: `assertWorkOrderItemStatusTransition` is still used by the finalize worker — leave it. `assignDraftIds` is no longer needed (no draft UUIDs to stamp; the DB allocates the PK on insert) — delete.

### Phase 2 — Data

- `packages/db/src/flooring/work-orders/cut-logs/write-repository.ts`:
  - `insertPendingCutLogRow(c, input)` — receives `{ workOrderId, workOrderItemId, inventoryId, cut, coverageCut, isWaste, notes, unitSnapshot: { stockUnitAbbrev, stockUnitName, itemCoverageUnitAbbrev, itemCoverageUnitName } }`. Inserts a single row with `status='PENDING'`, `isFinal=false`, `void=false`, `before=null`, `after=null`, `finalCutSequence=null`, `cost=null`, `freight=null`. Returns the inserted row. PK allocated by DB.
  - `updatePendingCutLogRow(c, { id, patch })` — patch is `{ cut?, coverageCut?, isWaste?, notes? }` only. Never writes to `inventoryId`, `workOrderId`, `workOrderItemId`, `status`, `isFinal`, `void`, `before`, `after`, `finalCutSequence`, `cost`, `freight`, `cutLogNumber`, `createdAt`, or any of the four unit-snapshot fields. Returns the updated row.
  - `deletePendingCutLogRow(c, { id })` — `flooringCutLog.delete({ where: { id } })`.
  - `applyWorkOrderItemCutLogPendingDiff` (DELETE): no longer used.
- `packages/db/src/flooring/work-orders/cut-logs/read-repository.ts`:
  - `getPendingCutLogWithInventoryForMutation(c, cutLogId)` — single round trip returning `{ id, inventoryId, workOrderItemId, status, isFinal, void, updatedAt, cut, coverageCut, inventory: { id, categorySlug, coveragePerUnit, startingStock, stockUnitAbbrev, stockUnitName, itemCoverageUnitAbbrev, itemCoverageUnitName } }`. Powers update + delete: ownership/linkage assertions, OCC check, status check, coverage re-derivation, invariant recompute.
  - `getInventoryForPendingCutLogCreate(c, inventoryId)` — same inventory shape, used by the create path before insert.
- Reuses (no edits):
  - `lockInventoriesForCutLogBatch(c, [inventoryId])` — call with a single-element array. The deterministic-sort logic is still correct for one row.
  - `recomputeAndPersistTotalCutSums(c, [inventoryId])` — call per-mutation with the one touched inventory id.
- `packages/db/src/flooring/work-orders/cut-logs/index.ts` — update barrel exports.

### Phase 3 — Application (the three use cases)

Pattern (each use case lives in its own file, no use case imports another):

```ts
// packages/application/src/flooring/work-orders/cut-logs/create-pending-cut-log.ts
export async function createPendingCutLogUseCase(
  input: CreatePendingCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<CreatePendingCutLogResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx
    // 1. Load WOMI, assert ownership of work order, assert status === IDLE.
    // 2. assertCutLogLinkageSymmetry({ workOrderId, workOrderItemId }).
    // 3. lockInventoriesForCutLogBatch(c, [input.inventoryId]).
    // 4. Read inventory under the lock — categorySlug, coveragePerUnit, startingStock, 4 unit-snapshot fields.
    // 5. Assert inventory belongs to a row whose WOMI linkage holds (cut log inventory == inventory id given).
    // 6. Derive coverageCut via computeCutCoverage.
    // 7. insertPendingCutLogRow — stamps the four unit-snapshot fields from the inventory read.
    // 8. recomputeAndPersistTotalCutSums(c, [inventoryId]).
    // 9. assertCutSumWithinStartingStock(recomputed, startingStock).
    // 10. Return the inserted row.
  })
}
```

```ts
// update-pending-cut-log.ts
export async function updatePendingCutLogUseCase(
  input: UpdatePendingCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<UpdatePendingCutLogResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx
    // 1. Load WOMI, assert status === IDLE.
    // 2. getPendingCutLogWithInventoryForMutation(c, cutLogId).
    // 3. Assert row.workOrderItemId === input.workOrderItemId (linkage).
    // 4. assertCutLogPendingMutationAllowed(row) — status === PENDING (final cuts cannot be edited via this path).
    // 5. assertCutLogExpectedUpdatedAtMatches({ row, expected: input.expectedUpdatedAt }) — OCC.
    // 6. lockInventoriesForCutLogBatch(c, [row.inventoryId]).
    // 7. If patch.cut changed → re-derive coverageCut from row.inventory.{categorySlug, coveragePerUnit}.
    //    Otherwise leave coverageCut absent from patch (so it isn't mutated).
    // 8. updatePendingCutLogRow(c, { id, patch }). Patch never includes unit-snapshot, before/after/finalCutSequence, isFinal, void.
    // 9. recomputeAndPersistTotalCutSums(c, [row.inventoryId]).
    // 10. assertCutSumWithinStartingStock.
    // 11. Return the updated row.
  })
}
```

```ts
// delete-pending-cut-log.ts
export async function deletePendingCutLogUseCase(
  input: DeletePendingCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<DeletePendingCutLogResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx
    // 1. Load WOMI, assert status === IDLE.
    // 2. getPendingCutLogWithInventoryForMutation(c, cutLogId).
    // 3. Assert linkage.
    // 4. assertCutLogDeleteAllowed(row) — PENDING only. Final cuts cannot be deleted (only voided, separate flow).
    // 5. assertCutLogExpectedUpdatedAtMatches.
    // 6. lockInventoriesForCutLogBatch(c, [row.inventoryId]).
    // 7. deletePendingCutLogRow(c, { id }).
    // 8. recomputeAndPersistTotalCutSums(c, [row.inventoryId]).
    // 9. assertCutSumWithinStartingStock (defensive — total can only decrease, but worth asserting for symmetry).
    // 10. Return { deletedId: id, inventoryId: row.inventoryId }.
  })
}
```

- All three: no outbox writes, no WOMI status flip (status stays IDLE through the TX). Errors are `WorkOrderCutLogExecutionError` instances with appropriate codes (`WORK_ORDER_CUT_LOG_NOT_FOUND`, `WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH`, `WORK_ORDER_CUT_LOG_NOT_PENDING`, `WORK_ORDER_CUT_LOG_STALE`, `WORK_ORDER_ITEM_NOT_IDLE`, `WORK_ORDER_CUT_LOG_INVARIANT_VIOLATION`).
- Delete the producer + consumer files; update barrel exports in `packages/application/src/flooring/work-orders/cut-logs/index.ts`.
- Delete `markWorkOrderItemFailedFromCutLogDiff` — no FAILED transition needed for sync flows. The function is exclusively used by the worker processor (also being deleted).

### Phase 4 — Outbox / relay / worker dismantle

- **Worker**:
  - DELETE `apps/worker/src/processors/save-work-order-item-pending-cut-log-diff.ts`.
  - EDIT `apps/worker/src/bootstrap.ts` — remove the BullMQ Worker instantiation, queue ref, and event listener registrations for the pending-diff job (the block reported at lines 105–183). Keep all imports/handlers for `materialize-import-batch` and `finalize-work-order-cut-log-batch` untouched.
- **Relay**:
  - DELETE `apps/relay/src/dispatch/build-save-work-order-item-pending-cut-log-dispatcher.ts`.
  - EDIT `apps/relay/src/dispatch/dispatchers.ts` — remove the `buildSaveWorkOrderItemPendingCutLogDispatcher()` registration entry. Keep finalize and imports dispatchers.
- **Domain queue contract**:
  - DELETE `packages/domain/src/queue/save-work-order-item-pending-cut-log-diff.ts`.
  - EDIT `packages/domain/src/queue/index.ts` — drop the re-exports.
- **Application use cases**:
  - DELETE `packages/application/src/flooring/work-orders/cut-logs/save-work-order-item-pending-cut-log-diff.ts`.
  - DELETE `packages/application/src/flooring/work-orders/cut-logs/apply-work-order-item-pending-cut-log-diff.ts`.
  - EDIT `packages/application/src/flooring/work-orders/cut-logs/index.ts` barrel.
- **Verification**: grep for `SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF`, `flooring.work-order-item.pending-cut-log.save`, `flooring-work-order-item-pending-cut-log-diff`, `pending-cut-log-diff` (job name), `wo-pcl-diff:` — every reference outside docs must be gone.
- **Note**: any compiled artifacts in `apps/worker/dist/` and `apps/relay/dist/` matching `*pending*cut*log*` are stale build outputs. They are not source — they regenerate on next build, so we do not hand-delete them. (Build verification confirms they don't reappear.)
- The `cut-logs/pending-cut-log-worker.md` plan file is now historical; leave it in place but it is superseded by this plan.

### Phase 5 — API routes (3 routes)

Each route uses the canonical mutation gauntlet: `applyRoutePolicy` → `parseUuidParam` → `parseMutationEnvelope` → `enforceMutationReceipt` → `withMutationTelemetry(...) → useCase()` → `finalizeMutationReceipt` → `routeJson(200)` / `routeError`. Use cases open the transaction; routes import nothing from the data or domain layers.

| Route | Method | Calls | Receipt scope |
|---|---|---|---|
| `apps/web/app/api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/route.ts` | POST | `createPendingCutLogUseCase` | `work-orders.material-items.pending-cut-logs.create` |
| `apps/web/app/api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/[cutLogId]/route.ts` | PATCH | `updatePendingCutLogUseCase` | `work-orders.material-items.pending-cut-logs.update` |
| `apps/web/app/api/work-orders/[id]/material-items/[itemId]/pending-cut-logs/[cutLogId]/route.ts` | DELETE | `deletePendingCutLogUseCase` | `work-orders.material-items.pending-cut-logs.delete` |

- DELETE accepts a JSON body (`{ requestKey, expectedUpdatedAt }`) — `parseMutationEnvelope` already supports this; matches existing DELETE patterns in this codebase. (If exploration during execution finds DELETE bodies aren't supported by existing helpers, fall back to header-carried `requestKey` + `If-Unmodified-Since`-style header.)
- Returns 200 OK with the post-mutation row (create + update) or `{ deletedId, inventoryId, recomputedTotalCutSum }` for delete. No more 202.
- DELETE the existing `section/route.ts`.
- Rate limits: scope per route, mirror existing limits (e.g., `limit: 50, windowMs: 10 * 60 * 1000` per the section route today). Capability: `system.access`. Tool slug: `WORK_ORDERS_TOOL_SLUG`.

### Phase 6 — Validators

In `apps/web/app/api/work-orders/_validators.ts`:

- DELETE `validateWorkOrderItemPendingCutLogDiffInput` and `ValidatedWorkOrderItemPendingCutLogDiffInput`. Also delete the diff-row helpers (`validatePendingDraft`, `validatePendingUpdate`, `validatePendingDelete`).
- ADD:
  - `validateCreatePendingCutLogInput(body)` → `{ requestKey, inventoryId, cut, isWaste, notes }`. Reuses `requireString` / `failCutLog`.
  - `validateUpdatePendingCutLogInput(body)` → `{ requestKey, expectedUpdatedAt, patch: { cut?, isWaste?, notes? } }`. Empty-patch case rejected.
  - `validateDeletePendingCutLogInput(body)` → `{ requestKey, expectedUpdatedAt }`.
- Keep the existing helpers (`requireString`, `optionalString`, `failCutLog`, etc.) untouched.

### Phase 7 — UI / controllers / hooks (DEFERRED — next sweep, not this one)

Recorded here for context only. No work in this sweep.

After API/application/domain/data land, the controller/UI rework will:
- Replace `useWorkOrderCutLogSectionState` with row-level controllers (`useCreatePendingCutLogRow`, `useUpdatePendingCutLogRow`, `useDeletePendingCutLogRow` or one merged `useCutLogRowEditor`) that own a row's local edit state and fire the per-row mutation when its inline trigger button is clicked.
- Remove the section-wide "Save Pending Cuts" / "Discard Pending Cuts" buttons from `work-order-material-items-section.tsx`.
- Add the inline trigger to each cut log row in `work-order-cut-log-row.tsx`. **Disabled until the row is dirty.**
- Enforce single-row dirty edits: if the user edits row A and clicks/focuses any other row before triggering A's mutation, A's local state is automatically discarded (the row reseeds from the server snapshot). This is the user's locked decision.
- Add `data/mutations.ts` client helpers: `createPendingCutLogRequest`, `updatePendingCutLogRequest`, `deletePendingCutLogRequest` (each wrapping `withMutationMeta`). Drop `saveWorkOrderItemPendingCutLogDiffRequest`.
- React-Query invalidation: each successful mutation invalidates the work-order detail query so the WOMI's cut-log set re-fetches.

---

## Verification (done as part of execution, not pre-approval)

- `pnpm typecheck` clean across the monorepo (especially `packages/application`, `packages/db`, `packages/domain`, `apps/web`, `apps/worker`, `apps/relay`).
- `pnpm test` for the cut-log packages — domain predicates, write-repository, use case unit tests (one per use case).
- Integration: hit each new route end-to-end with curl or a test script:
  - POST a draft → row appears with `status=PENDING`, the four unit-snapshot fields populated from the parent inventory, `coverageCut` derived per category, parent inventory `totalCutSum` updated.
  - PATCH `cut` → `coverageCut` re-derived, `totalCutSum` updated, unit-snapshot unchanged.
  - DELETE → row gone, `totalCutSum` updated.
  - Concurrency: two PATCHes with the same `expectedUpdatedAt` → second returns 409 `WORK_ORDER_CUT_LOG_STALE`.
  - Final cut log delete attempt → 409 `WORK_ORDER_CUT_LOG_DELETE_NOT_ALLOWED`.
  - WOMI in `FINALIZING` → all three routes return 409 `WORK_ORDER_ITEM_NOT_IDLE`.
- BullMQ console: confirm no `flooring-work-order-item-pending-cut-log-diff` queue is registered after restart.
- Outbox table: confirm no rows being written with topic `flooring.work-order-item.pending-cut-log.save` after the change ships.
- Grep gate (CI-friendly): no source references to the deleted symbols outside docs.

---

## Commit plan

Per CLAUDE.md ("Schema changes are always in a commit by itself"; "Some layers may be executed in a bundle together especially if it's a bug fix"):

1. **schema:** drop `SAVING_CUTS` from `FlooringWorkOrderItemStatus` (Phase 0).
2. **domain + data:** new predicates, new write/read helpers, deletions of unused diff helpers (Phases 1–2).
3. **application:** three new use cases + delete the producer/consumer (Phase 3).
4. **worker/relay/outbox dismantle:** delete the processor, dispatcher, queue contract; edit bootstrap + dispatchers (Phase 4).
5. **api + validators:** three new routes + three new validators; delete the section route + diff validator (Phases 5–6).

> Per CLAUDE.md: *DO NOT COMMIT CHANGES.* These messages are for the user to use when they choose to commit.

---

## Open questions (any remaining — to resolve before / during execution)

1. **DELETE body support** — `parseMutationEnvelope` is the project's mutation envelope helper; need to confirm during execution that it parses DELETE bodies the same way it parses POST/PATCH bodies. If it doesn't, fall back to either: (a) accept `requestKey` + `expectedUpdatedAt` as headers, or (b) move to POST-with-method-override. Will resolve at the start of Phase 5.
2. **Receipt-store key shape** — confirm the existing `enforceMutationReceipt` accepts arbitrary scopes; today's pending diff route uses `work-orders.material-items.pending-cut-logs.section.replace`. New scopes follow the same naming pattern. No change expected, but flagging for execution-time check.
3. **WOMI `FAILED` cleanup** — there may be WOMIs in `FAILED` in production whose owning work order can no longer transition out (the old retry path lived in the worker UI). Out of scope for this sweep, but worth noting that a follow-up admin script may be needed to flip stuck `FAILED` WOMIs back to `IDLE`.
4. **Telemetry message strings** — match the existing pattern (`"Work-order pending cut-log diff queued"` → replace with `"Work-order pending cut log created"` etc.). Trivial; will write during execution.
5. **`recomputeAndPersistTotalCutSums` invariant on delete** — phase 3 calls it on delete defensively. Confirm at execution time whether it's called per-mutation (one inventory) or batched. Given the helper takes an array, single-element calls are fine.
