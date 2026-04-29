# Execution Log — Work Orders Sweep

Plan: [work-orders-sweep-plan.md](work-orders-sweep-plan.md) — locked.

| Sub-sweep | Status | Commit |
|---|---|---|
| 7a — Schema (WOMI status enum) | ✅ DONE | `67045274` |
| 7b — Domain (primary + MI subdir + cut-log payloads) | ✅ DONE | `1aaa6bab` |
| 7c — Domain (file-gen) | ✅ DONE | `62a94e63`, amended `f42f1ee9` (PDF columns), `2b81ccb9` (inventory cell) |
| 7d — Data | ✅ DONE | `ae9c8ea7` |
| 7e — Application (primary) | ✅ DONE | `53d94132` |
| 7f — Application (MI + cut-logs) | ✅ DONE | `aa277835` |
| 7g — Application (file-gen) | ✅ DONE | `1baa6181` |
| 7h — Worker/Relay | ✅ DONE | `d31a5c9f` |
| 7i — API | ⏳ next | — |
| 7j — Engine off-ramp | pending | — |
| 7k — Module dir UI | pending | — |
| 7l — Dashboard pages | pending | — |

---

## 7a — Schema (DONE, committed `67045274`)

| Step | Result |
|---|---|
| Edit `schema.prisma` — add `FlooringWorkOrderItemStatus` enum (IDLE / SAVING_CUTS / FINALIZING / FAILED) after existing `FlooringWorkOrderStatus` | ✅ |
| Edit `FlooringWorkOrderItem` — add `status FlooringWorkOrderItemStatus @default(IDLE)` field | ✅ |
| Author migration `packages/db/prisma/migrations/20260429160000_add_work_order_item_status/migration.sql` (CreateEnum + ALTER TABLE ADD COLUMN with default) | ✅ |
| `npm run db:deploy` (= `npx prisma migrate deploy`) → Railway staging via .env | ✅ exit 0 — applied to `shortline.proxy.rlwy.net:22153` |
| `npm run db:generate` (= `npx prisma generate`) | ✅ exit 0 |
| `npx prisma migrate status` | ✅ exit 0 — "Database schema is up to date!" |
| `npm run build --workspace @builders/db` | ✅ exit 0 |

**Working tree changes (commit 7a):**
- `packages/db/prisma/schema.prisma` — enum + field added
- `packages/db/prisma/migrations/20260429160000_add_work_order_item_status/migration.sql` — new
- Generated dist artifacts under `packages/db/dist/` (per repo convention from `21aea69`)

**Open issues:** none.

---

---

## 7b — Domain primary + material-items + cut-log payloads (DONE, committed `1aaa6bab`)

| Step | Result |
|---|---|
| Rewrite `types.ts` — surface `status`, sync snapshots, joined property fields on detail; drop `propertyInstructions` (live-derived); WorkOrderForm excludes status | ✅ |
| Rewrite `normalizers.ts` — map joined property fields + sync snapshots | ✅ |
| Rewrite `form-rules.ts` — require propertyId AND warehouseId | ✅ |
| Update `error-messages.ts` — add warehouse-locked + cut-log-write-failed + file-gen-failed | ✅ |
| New `errors.ts` — `WorkOrderDomainError` class + 4 error codes | ✅ |
| New `lock-rules.ts` — `assertWorkOrderWarehouseChangeAllowed` throws `WORK_ORDER_WAREHOUSE_LOCKED` | ✅ |
| New `material-items/{types,rules,normalizers,diff-rules,status-rules,index}.ts` (6 files) | ✅ |
| New queue payload `save-work-order-item-pending-cut-log-diff.ts` (per-WOMI; cost+freight absent) | ✅ |
| New queue payload `finalize-work-order-cut-log-batch.ts` (WO-scoped batch) | ✅ |
| Update `index.ts` (WO + queue re-exports) | ✅ |
| `npm run typecheck --workspace @builders/domain` | ✅ exit 0 |
| `npm run build --workspace @builders/domain` | ✅ exit 0 |

**Expected DB layer errors remaining (deferred to 7d rewrite):** 4 errors in `packages/db/src/flooring/work-orders/{read-repository,write-repository}.ts` — selects don't include the new fields the rewritten normalizers require. Will be cleared by 7d.

**Open issues:** none.

---

## 7c — Domain file generation (DONE, committed `62a94e63` + amendments)

| Step | Result |
|---|---|
| New `flooring/work-orders/file-generation/types.ts` — `WorkOrderFileGenerationInput` joined input shape (WO row + property + WOMIs + cut logs grouped per WOMI) + `WorkOrderFileMaterialItemProjection` + `WorkOrderFileCutLogProjection` | ✅ |
| New `flooring/work-orders/file-generation/build-work-order-pdf-html.ts` — pure projection from input → printable HTML; no I/O; inline-styled so the rendered PDF doesn't depend on external CSS; every dynamic value escapes via `escapeHtml` | ✅ |
| New `flooring/work-orders/file-generation/index.ts` — re-exports | ✅ |
| New queue payload `queue/generate-work-order-file.ts` — topic `flooring.work-order.file-generation.requested`; payload `{ version, topic, workOrderId, fileId, requestedBy, requestedAt }`; mirrors `void-cut-log.ts` shape | ✅ |
| Update `flooring/work-orders/index.ts` — re-export `file-generation/` | ✅ |
| Update `domain/src/index.ts` — re-export `queue/generate-work-order-file.js` | ✅ |
| `npm run typecheck --workspace @builders/domain` | ✅ exit 0 |
| `npm run build --workspace @builders/domain` | ✅ exit 0 |

**Design notes:**

- `WorkOrderFileGenerationInput` carries `customAddress`, joined `property.streetAddress/city/state/postalCode`, joined `property.instructions`. Builder uses `customAddress` if present, else falls back to formatted property address.
- HTML body emits sections only when content exists (instructions, description, notes, cut-log sub-tables) so empty PDFs stay tight.
- Cut log row uses CSS class per status (`cut-log-pending` / `cut-log-final` / `cut-log-void`) — voids render struck-through and grey.
- Per locked decision #4: PDF is the snapshot. No JSONB or snapshot tables. Worker reads live joined data at render time via `getWorkOrderForFileGeneration` (authored in 7d).

**Open issues:** none.

---

## 7d — Data layer (DONE, committed `ae9c8ea7`)

### Pre-flight audit confirmed

- Zero external consumers of the existing WO data exports (verified via grep across `packages/` + `apps/`). Safe full rewrite.
- Two dead `propertyInstructions` references in pre-rewrite `shared.ts:32` + `write-repository.ts:16/31/41`. Cleared by the rewrite.
- Subdirs `material-items/`, `files/`, `cut-logs/` did not exist — clean slate.

### Files rewritten (3)

| File | Changes |
|---|---|
| `packages/db/src/flooring/work-orders/shared.ts` | Split `workOrderListSelect` (lightweight `property: { name }`) and `workOrderDetailSelect` (full property join with address + instructions). Both surface `status`, `description`, `scheduledFor`. Detail also pulls sync snapshot columns. Drops `propertyInstructions`. |
| `read-repository.ts` | `listWorkOrders`, `listWorkOrderOptions`, `getWorkOrderById` (list shape — existence + lock context), `getWorkOrderDetailById` (full detail), `countWorkOrders`, `countWorkOrderCutLogs` (warehouse-change-lock predicate input), and the big one — `getWorkOrderForFileGeneration` projecting directly to `WorkOrderFileGenerationInput` with joined inventory location codes via `formatFullLocationCode`. |
| `write-repository.ts` | `CreateWorkOrderRecordInput` omits `status` + sync snapshots (worker-controlled). `Update` is `Partial<Create>`. New `markWorkOrderStatus` for the file-gen lifecycle. |

### Files created (8)

| Path | Exports |
|---|---|
| `material-items/read-repository.ts` | `listWorkOrderMaterialItems`, `countCutLogsByWorkOrderItemIds`, `listEligibleInventoryForWorkOrderItem` (warehouse + product match + remaining stock > 0, formatted location code). |
| `material-items/write-repository.ts` | `WriteWorkOrderMaterialItemInput`, CRUD record functions, `applyWorkOrderMaterialItemsDiff` — **nulls cut-log links (both columns) inside the TX before deleting any WOMI row** to keep `assertCutLogLinkageSymmetry` satisfied; `markWorkOrderItemStatus`. |
| `material-items/index.ts` | Re-exports. |
| `files/read-repository.ts` | `listWorkOrderFiles`, `getWorkOrderFileById`. |
| `files/write-repository.ts` | `createWorkOrderFile` (max+1 fileNumber, status=QUEUED), `markWorkOrderFileWorking/Completed/Failed`, `deleteWorkOrderFile`. |
| `files/index.ts` | Re-exports. |
| `cut-logs/read-repository.ts` | `listCutLogsForWorkOrderItem`, `getInventoriesForCutLogDiff`, `getInventoriesForCutLogIds`, `listCutLogsForInventoryIds`. |
| `cut-logs/write-repository.ts` | **`lockInventoriesForCutLogBatch`** (first multi-inventory locker in the codebase — sorts ascending, single `SELECT FOR UPDATE` over `id = ANY($1::uuid[])`), `applyWorkOrderItemCutLogPendingDiff` (stamps both link columns; computes per-inventory before/after under lock; cost+freight always null), `applyFinalizeWorkOrderCutLogBatch` (per-inventory `finalCutSequence` from max+1), `recomputeAndPersistTotalCutSums` (uses domain's pure `computeTotalCutSum`). |
| `cut-logs/index.ts` | Re-exports. |
| `flooring/work-orders/index.ts` | Re-exports the 3 new subdirs. |

### Verification gates

| Gate | Result |
|---|---|
| `npm run typecheck --workspace @builders/db` | ✅ exit 0 |
| `npm run build --workspace @builders/db` | ✅ exit 0 |
| `npm run typecheck --workspace @builders/application` | ✅ exit 0 (no regressions; application doesn't reference WO yet — that's 7e/7f/7g) |

### Notable design points

1. **Multi-inventory locking**: `lockInventoriesForCutLogBatch` deduplicates + sorts the id set before the FOR UPDATE. Deterministic ordering eliminates deadlock risk between concurrent WOMI cut-log writes that touch overlapping inventories.
2. **before/after computation**: For a pending diff that adds N drafts to inventory I, we read I's current `(startingStock, totalCutSum)` once inside the locked TX, then compute each draft's `before` = previous remaining and `after` = `before - cut`, threading the running remaining through the drafts in order. Application layer revalidates via `assertCutSumWithinStartingStock` after `recomputeAndPersistTotalCutSums` returns.
3. **WOMI delete via section save unlinks cut logs**: `applyWorkOrderMaterialItemsDiff` runs `flooringCutLog.updateMany({ where: { workOrderItemId IN deletedIds }, data: { workOrderId: null, workOrderItemId: null } })` before the WOMI deleteMany, all in the same TX. Symmetry preserved.
4. **`getWorkOrderForFileGeneration` returns the domain projection directly**: Keeps the file-gen worker's call shape minimal — read once, hand to `buildWorkOrderPdfHtml`. Data-layer carve-out for pure domain helpers (per CLAUDE.md) covers this — `formatFullLocationCode` is a pure formatter.
5. **No application-layer business logic leaked into data**: All status flips are thin row updates. Transition validity (`assertWorkOrderItemStatusTransition`) is the application layer's call.

**Open issues:** none.

---

## 7e — Application primary use cases (DONE, committed `53d94132`)

Created the WO application directory at `packages/application/src/flooring/work-orders/`. API + validators are NOT touched in this layer per user direction; that's 7i.

### Files created (6)

| File | Purpose |
|---|---|
| `errors.ts` | `WorkOrderExecutionError` class + 6 codes (validation, not-found, warehouse-locked, item-status-transition, cut-log-write-failed, file-gen-failed). Mirrors `TemplateExecutionError`'s shape. |
| `types.ts` | `CreateWorkOrderUseCaseInput = CreateWorkOrderRecordInput` (alias). `UpdateWorkOrderUseCaseInput = UpdateWorkOrderRecordInput`. `WorkOrderUseCaseResult = WorkOrderDetail`. |
| `create-work-order.ts` | Opens TX, validates required fields (propertyId + warehouseId), delegates to `createWorkOrderRecord`. |
| `update-work-order.ts` | Opens TX. Trims propertyId / warehouseId if patched. **Warehouse change lock**: if `input.warehouseId` is in patch, reads current via `getWorkOrderById`, calls `countWorkOrderCutLogs`, runs `assertWorkOrderWarehouseChangeAllowed`. Catches `WorkOrderDomainError("WORK_ORDER_WAREHOUSE_LOCKED")` and converts to `WorkOrderExecutionError` status 409. P2025 → 404. |
| `delete-work-order.ts` | Opens TX, calls `deleteWorkOrderRecordById`. Schema cascade unlinks cut logs (WO `onDelete: Cascade` to WOMI; WOMI `onDelete: SetNull` to cut log; WO `onDelete: SetNull` to cut log) — both link columns end up null together so `assertCutLogLinkageSymmetry` is satisfied without app-side null updates. P2025 → 404. |
| `index.ts` | Re-exports. |

`packages/application/src/index.ts` adds the workspace re-export between warehouses and management-companies entries.

### Verification gates

| Gate | Result |
|---|---|
| `npm run typecheck --workspace @builders/application` | ✅ exit 0 |
| `npm run build --workspace @builders/application` | ✅ exit 0 |

### Notable design points

1. **No HTTP concerns**: zero Request/Response/status imports. Status codes are carried as numbers on `WorkOrderExecutionError.status` for the API layer (7i) to translate.
2. **Transactions**: every use case wraps via `withDatabaseTransaction(...)`. The `client?` parameter allows callers (typically other use cases) to share an existing TX.
3. **Domain rule routing**: `assertWorkOrderWarehouseChangeAllowed` is the only domain throw in the primary flow. Caught + rethrown as the application error. Validation strings imported from `@builders/domain` (single source of truth).
4. **Delete is unblocked**: per the locked sweep decision, WO deletion no longer asserts a cut-log count; the schema's SetNull cascade is the unlink mechanism. Comment in the use case documents the chain.

**Open issues:** none.

---

## 7f — Application MI + cut-log use cases (DONE, committed `aa277835`)

API + validators NOT touched (deferred to 7i). 16 application files added across two subdirs.

### `material-items/` subdir (7 files)

| File | Purpose |
|---|---|
| `errors.ts` | `WorkOrderMaterialItemExecutionError` + 2 codes (validation, not-found). |
| `types.ts` | UseCase input/output types + `tempIdMap` return shape on the section save. |
| `create-work-order-material-item.ts` | Validate form → load product → `buildItemSendUnitSnapshotFromProduct` → write. WOMI starts at `IDLE` per data-layer default. |
| `update-work-order-material-item.ts` | Same shape; re-snapshots when product changes. P2025 → 404. |
| `delete-work-order-material-item.ts` | Thin call to data layer. The data write nulls cut-log links inside the TX before deleting (preserves `assertCutLogLinkageSymmetry`). Per locked decision #1, no domain throw to convert. |
| `save-work-order-material-items-section.ts` | Mirrors the templates section-save: per-row form validation → distinct productIds batch fetch → snapshot stamping → `assignDraftIds` → `applyWorkOrderMaterialItemsDiff`. The data write also handles cut-log unlinks for any deleted rows. |
| `index.ts` | Re-exports. |

### `cut-logs/` subdir (8 files)

| File | Purpose |
|---|---|
| `errors.ts` | `WorkOrderCutLogExecutionError` + 7 codes (validation, not-found, linkage-mismatch, status-transition, void-not-allowed, finalize-blocked, batch-failed). |
| `types.ts` | Producer/consumer input + result types (incl. `RequestedBy`, `WorkOrderCutLogPendingDiff`). |
| `save-work-order-item-pending-cut-log-diff.ts` | **Producer.** TX: fetch WOMI, assert WO linkage, transition WOMI → `SAVING_CUTS` via `assertWorkOrderItemStatusTransition`, stamp UUIDs via `assignDraftIds`, defensive `assertCutLogLinkageSymmetry` on the producer-stamped pair, write outbox event with idempotency key `wo-pcl-diff:${workOrderItemId}:${requestKey}`. |
| `apply-work-order-item-pending-cut-log-diff.ts` | **Consumer.** TX: derive touched inventoryIds via `getInventoriesForCutLogDiff` → `lockInventoriesForCutLogBatch` → `applyWorkOrderItemCutLogPendingDiff` → `recomputeAndPersistTotalCutSums` → `assertCutSumWithinStartingStock` per inventory → mark WOMI `IDLE`. Plus `markWorkOrderItemFailedFromCutLogDiff` for the worker's catch path (fresh TX). |
| `finalize-work-order-cut-log-batch.ts` | **Producer.** TX: fetch every selected cut log, reject if any row's `workOrderId` mismatches OR fails `getCutLogFinalizabilityBlocker` / `canFinalizeCutLog` predicates. Aggregate touched WOMIs, transition each to `FINALIZING`, write outbox event with key `wo-cl-finalize:${workOrderId}:${requestKey}`. |
| `apply-finalize-work-order-cut-log-batch.ts` | **Consumer.** TX: derive inventoryIds via `getInventoriesForCutLogIds` → lock → defensive revalidate every row's finalize predicate under the lock → `applyFinalizeWorkOrderCutLogBatch` (per-inventory finalCutSequence stamp) → recompute totalCutSum + assert invariant per inventory → mark every touched WOMI `IDLE`. Plus `markWorkOrderItemsFailedFromFinalizeBatch`. |
| `void-work-order-cut-log.ts` | **SYNC use case (no worker, no outbox).** TX: fetch row, assert WO linkage, single-inventory `SELECT ... FOR UPDATE` lock, assert `canVoidCutLog`, apply `buildVoidedCutLogPatch`, recompute totalCutSum + assert invariant. Returns `{ id, inventoryId }`. **No WOMI status change** per locked decision #1. |
| `index.ts` | Re-exports. |

### Verification gates

| Gate | Result |
|---|---|
| `npm run typecheck --workspace @builders/application` | ✅ exit 0 (after fixing 4 Decimal vs string mismatches by stringifying `cut` before passing to `canFinalizeCutLog` / `getCutLogFinalizabilityBlocker`) |
| `npm run build --workspace @builders/application` | ✅ exit 0 |

### Notable design points

1. **TempIds vs real IDs**: tempId is a UI-state marker; real UUID is producer-stamped via `assignDraftIds` (the shared `packages/domain/src/shared/diff-identity.ts` helper). Pre-stamping makes the worker's `createMany` idempotent across retries — Postgres unique-pk catches duplicates.
2. **Idempotency key shape**: `topic:aggregateId:requestKey` — exactly 3 colon-separated parts per BullMQ rule. `requestKey` is the client-generated UUID (locked decision #6).
3. **Status transition routing**: producer handles `current → SAVING_CUTS / FINALIZING` via `assertWorkOrderItemStatusTransition`. The catch in 409 surfaces "material item is busy" to the UI. Consumer flips back to `IDLE` on success; worker's catch path flips to `FAILED` in a separate TX so the FAILED state survives the rollback.
4. **Defensive predicate revalidation**: producer-time and consumer-time both re-check `canFinalizeCutLog` etc. The consumer's revalidation runs UNDER the multi-inventory lock — catches drift (e.g. a void landed between producer enqueue and worker pickup).
5. **Linkage symmetry**: producer stamps both `workOrderId` and `workOrderItemId` on every draft; calls `assertCutLogLinkageSymmetry` defensively over the pair. The data-layer write writes both columns together. Worker has no opportunity to break symmetry.
6. **Void linkage validation** (Q2 from the 7f confirmation): `voidWorkOrderCutLogUseCase` accepts `{ workOrderId, cutLogId }` and rejects with `WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH` if the cut log's `workOrderId` differs from the input — before any DB write.

`flooring/work-orders/index.ts` re-exports both new subdirs alongside the primary use cases.

**Open issues:** none.

---

## 7g — Application file-gen producer + consumer (DONE, committed `1baa6181`)

### Library helper added (1 file modified)

| File | Change |
|---|---|
| `packages/lib/src/storage.ts` | New `deleteBucketObject(env, key)` SDK wrapper. Imports `DeleteObjectCommand` from `@aws-sdk/client-s3`. Returns `Promise<void>`. Required by `deleteWorkOrderFileUseCase`. Per CLAUDE.md `lib` package rule — thin SDK wrapper only, no business logic. |

### Files created (6)

| File | Purpose |
|---|---|
| `application/.../files/errors.ts` | `WorkOrderFileExecutionError` + 4 codes (not-found, generation-failed, delete-failed, invalid-state). |
| `files/types.ts` | Use-case input/output types. `GenerateWorkOrderFileInput` + `DeleteWorkOrderFileInput` accept `storageEnv: StorageEnvironment` (caller injects from `process.env`; application package never reads env directly per CLAUDE.md). |
| `files/request-work-order-file.ts` | **Producer.** Single TX: verify WO exists → `createWorkOrderFile` (max+1 fileNumber, status QUEUED) → `markWorkOrderStatus(WO, QUEUED)` → `createQueueOutboxEvent` with idempotency key `wo-file-gen:${workOrderId}:${fileId}`. P2025 → 404. |
| `files/generate-work-order-file.ts` | **Consumer.** Three phases: **TX1** locks the file row + asserts QUEUED + marks WORKING + marks WO WORKING. **IO** reads via `getWorkOrderForFileGeneration({ generatedAt })`, builds HTML via `buildWorkOrderPdfHtml`, renders PDF via `renderHtmlToPdf` (`@builders/pdf`), uploads via `uploadBucketObject` to key `work-orders/${workOrderId}/${fileId}.pdf`. **TX2** marks file COMPLETED + persists fileKey + marks WO COMPLETED. On any error in IO or TX2, runs a separate-TX `markFailedAfterRender` to flip both rows to FAILED, then throws `WorkOrderFileExecutionError(WORK_ORDER_FILE_GENERATION_FAILED, status 500)`. |
| `files/delete-work-order-file.ts` | **Sync.** Read row outside TX → assert WO linkage → if `fileKey` non-null, call `deleteBucketObject` (lib SDK wrapper) → delete row in TX. P2025 on row delete is treated as no-op (already gone). Bucket delete failure surfaces as `WORK_ORDER_FILE_DELETE_FAILED`. |
| `files/index.ts` | Re-exports. |

`flooring/work-orders/index.ts` re-exports `files/`.

### Verification gates

| Gate | Result |
|---|---|
| `npm run build --workspace @builders/lib` | ✅ exit 0 |
| `npm run typecheck --workspace @builders/application` | ✅ exit 0 |
| `npm run build --workspace @builders/application` | ✅ exit 0 |

### Notable design points

1. **TX boundaries**: producer is single-TX. Consumer splits into TX1 (lock + WORKING) → IO (PDF render + upload, no DB lock held) → TX2 (COMPLETED). Critical for not holding a TX open during the puppeteer render which can take seconds.
2. **Failure isolation**: `markFailedAfterRender` runs in a fresh TX so the FAILED state survives any rollback that triggered it. Mirrors the cut-log worker's `markWorkOrderItemFailedFromCutLogDiff` pattern.
3. **Storage env injected**: application use cases accept `storageEnv: StorageEnvironment` as part of input rather than reading `process.env` themselves. The worker entrypoint (7h) and the API delete route (7i) load env at their own boundaries and pass it in.
4. **Bucket key shape**: `work-orders/${workOrderId}/${fileId}.pdf` — predictable, scoped, easy to debug. Per-WO prefix groups all that WO's files together in the bucket.
5. **Defensive QUEUED check in TX1**: if a duplicate outbox event fires after the original worker already started, the second worker sees status WORKING (or COMPLETED) and short-circuits with `WORK_ORDER_FILE_INVALID_STATE`. Idempotency belt-and-suspenders alongside the BullMQ `idempotencyKey`.
6. **Sync delete**: bucket delete is OUTSIDE the database TX (Postgres can't lock S3). If the bucket delete succeeds but the row delete fails, retry is safe — bucket delete on a missing object is a no-op.

**Open issues:** none.

---

## 7h — Worker / Relay / Queue registration (DONE, committed `d31a5c9f`)

Pre-flight inventory pass confirmed the canonical patterns to mirror:
- Worker processors: `create<Name>Handler(deps?)` factory; catches application execution errors → `UnrecoverableError`; other errors propagate.
- Relay dispatchers: `build<Name>Dispatcher(connection)` returning `TopicDispatcher<Payload>`; `buildJobId: (_payload, event) => event.idempotencyKey`.
- Bootstrap: per-queue Worker + QueueEvents block with `active`/`completed`/`failed` listeners, `autorun: false` + deferred `.run()`.

### Files created (6)

| File | Purpose |
|---|---|
| `apps/worker/src/processors/save-work-order-item-pending-cut-log-diff.ts` | Pending-cut-log-diff processor. Calls `applyWorkOrderItemPendingCutLogDiffUseCase`; on any throw, calls `markWorkOrderItemFailedFromCutLogDiff(payload.workOrderItemId)` in a fresh TX before classifying — so WOMI ends at FAILED whether the error is unrecoverable or transient. |
| `apps/worker/src/processors/finalize-work-order-cut-log-batch.ts` | Finalize-batch processor. Calls `applyFinalizeWorkOrderCutLogBatchUseCase`; on any throw, calls `markWorkOrderItemsFailedFromFinalizeBatch(payload.cutLogIds)` (helper resolves WOMIs from the cut-log IDs internally). |
| `apps/worker/src/processors/work-order-file-generation.ts` | File-gen processor. Factory takes `{ storageEnv, dependencies? }` so the bootstrap injects the `StorageEnvironment` once. Calls `generateWorkOrderFileUseCase`; the use case handles its own FAILED markers (separate-TX `markFailedAfterRender`). |
| `apps/relay/src/dispatch/build-save-work-order-item-pending-cut-log-dispatcher.ts` | Mirrors `build-finalize-cut-log-dispatcher.ts`. Topic `flooring.work-order-item.pending-cut-log.save` → queue `flooring-work-order-item-pending-cut-log-diff`. |
| `apps/relay/src/dispatch/build-finalize-work-order-cut-log-dispatcher.ts` | Topic `flooring.work-order.cut-log.finalize` → queue `flooring-work-order-cut-log-finalize`. |
| `apps/relay/src/dispatch/build-work-order-file-generation-dispatcher.ts` | Topic `flooring.work-order.file-generation.requested` → queue `flooring-work-order-file-generation`. |

### Files modified (4)

| File | Change |
|---|---|
| `apps/worker/src/env.ts` | Adds 6 concurrency/lock env vars (3 worker × 2 each). Adds 5 `AWS_*` env vars (optional at schema; required by `getWorkerStorageEnvironment` only when the file-gen worker registers). New `StorageEnvironment` import + `getWorkerStorageEnvironment(env)` helper that throws with a precise list of missing vars. File-gen worker uses 180_000 ms lock duration since PDF render + bucket upload take longer than the default 60 s. |
| `apps/worker/src/bootstrap.ts` | Adds 3 new worker blocks (pending-diff, finalize-batch, file-gen) following the existing template: Worker + QueueEvents + active/completed/failed listeners. `autorun: false` on all 3; `.run()` deferred until after `waitUntilReady`. Storage env asserted at boot via `getWorkerStorageEnvironment(env)` so a missing AWS var fails fast on container start. Graceful shutdown updated to close the new 3 Workers + 3 QueueEvents. Ready log + queue list extended. |
| `apps/relay/src/dispatch/dispatchers.ts` | Appends 3 new entries to `buildDispatchers(connection)`. |
| `packages/application/src/flooring/work-orders/cut-logs/apply-finalize-work-order-cut-log-batch.ts` | Updated `markWorkOrderItemsFailedFromFinalizeBatch` to take `cutLogIds: string[]` (was `workOrderItemIds`) and resolve the unique non-null WOMI set internally. The worker processor only has cut-log IDs at catch time; this matches that shape. |

### Verification gates

| Gate | Result |
|---|---|
| `npm run build --workspace @builders/lib` | ✅ exit 0 |
| `npm run build --workspace @builders/application` | ✅ exit 0 |
| `npm run typecheck --workspace @builders/relay` | ✅ exit 0 |
| `npm run typecheck --workspace @builders/worker` | ✅ exit 0 |
| `npm run build --workspace @builders/relay` | ✅ exit 0 |
| `npm run build --workspace @builders/worker` | ✅ exit 0 |

### Notable design points

1. **Idempotency keys propagate cleanly.** Producer writes `wo-pcl-diff:${workOrderItemId}:${requestKey}` (etc.) into the outbox `idempotencyKey` field. Dispatcher copies that into BullMQ `jobId`. Duplicate fires collapse via the BullMQ unique-jobId check + the outbox unique constraint at the DB layer.
2. **Failure marker placement.** Pending-diff and finalize processors call the application-layer fresh-TX failure markers BEFORE classifying the error. File-gen processor delegates to the use case (which already handles `markFailedAfterRender` internally). Two paths, same outcome: row never sits at SAVING_CUTS / FINALIZING / WORKING after a failed job.
3. **Storage env injected at handler-factory time** for the file-gen worker. Application package never reads `process.env`. Worker bootstrap reads env once, projects to `StorageEnvironment`, hands to factory. Mirrors the shape used elsewhere in the codebase for SDK env wiring.
4. **`autorun: false` + deferred `.run()`** on every Worker — eliminates the cold-start race where the first job's lifecycle log lines could be dropped before listeners attach.
5. **PDF render lock duration is 3× longer.** Default lock is 60 s; PDF render via puppeteer + bucket upload can hit ~30 s on cold start. 180 s gives headroom without leaking the lock indefinitely.

**Open issues:** none.

---

## Notes

- Per CLAUDE.md: schema lands alone in its own commit; subsequent sub-sweeps may bundle related changes per layer.
- Plan + this execution file live at `a-branch/` per project convention.
- 7b's gate per the plan was domain typecheck only (data + application + web are deferred to their own sub-sweeps); the 4 DB errors above are the expected leftover surface.
- 7h required a small refactor in 7f's `markWorkOrderItemsFailedFromFinalizeBatch` to take cut-log IDs (the shape the worker has at catch time) rather than WOMI IDs. Bundled with the 7h commit since it has no other callers.
