# Master Plan — Work Orders Sweep

## Context

The work-orders module is currently a non-canonical scaffold tightly coupled to the deprecated `apps/web/modules/shared/engines/record-view/` engine. It has zero application use cases, zero API routes, and zero data-section-save flow. The schema was migrated to support the sweep (status enum, sync snapshots, files relation), and the immediately-prior cleanup stripped `propertyInstructions` from templates so this sweep starts from a clean templates baseline.

This sweep delivers the WO module end-to-end across **three sections** of the record view — primary fields, material items (with cut-log management built in), and files (PDF generation). After this sweep ships, cut logs become editable **only** from the WO record view; the inventory-side cut-log UI + workers are torn down in a follow-up sweep. That migration creates a clear authorial boundary: every cut log is born from a WO, carrying both `workOrderId` and `workOrderItemId` atomically.

**Locked decisions from clarification:**
| # | Decision | Implication |
|---|---|---|
| 1 | WOMI gets a new `status` enum field. WO row keeps existing `status` enum for file-gen lifecycle only. No roll-up. | Schema change in 7a. WOMI status: `IDLE / SAVING_CUTS / FINALIZING / FAILED`. **No `VOIDING`** — void is sync, single-row, no worker, no WOMI status flip. |
| 2 | Cut-log operations split into THREE use cases (mirrors inventory-side triad): pending-diff (worker, per-WOMI), finalize batch (worker, spans WOMIs across one WO), void (SYNC, single row, no worker). Each worker locks all touched inventories in deterministic ID order in a single TX. | First multi-inventory locker in the codebase. Void use case is fully synchronous — TX opens, locks one inventory, voids, recomputes totalCutSum, commits. |
| 3 | Cost + freight omitted from WO-side cut logs. Always `null` when written from this surface. | UI doesn't surface those columns. Inventory-side flow unaffected. |
| 4 | PDF artifact in bucket IS the snapshot. No JSONB snapshot column, no snapshot tables. | Worker reads live data at render time. Simplest schema. |
| 5 | Eligible-inventory dropdown fetches via dedicated route on-demand when user expands a WOMI row. Detail load stays light. | New route `[id]/material-items/[itemId]/eligible-inventory`. |
| 6 | Cut-log batch idempotency key is a client-generated UUID per submit, passed through the API. | Mirrors mutation-receipt pattern elsewhere. |
| 7 | WOMI `FAILED` status is unblockable — a new request from the producer path resets it via the standard transition. | No explicit "reset to IDLE" UI action needed. |

**Pre-locked from prior conversation:**
- WO delete unlinks cut logs (Prisma SetNull cascade — no app code needed).
- WOMI delete via section save unlinks cut logs (app code MUST null both link columns in TX before delete).
- Warehouse change blocked when WO has any cut logs (predicate throws).
- `propertyInstructions` derived live from `Property.instructions`. WO row column already dropped.
- Auto-assign cut logs to WOMIs is OUT of scope. Manual assignment only.
- Template-sync UI flow is OUT of scope.
- File-gen snapshot is the rendered PDF; not a database snapshot.

**Patterns reused (verified in exploration):**
- Templates material-items diff-save: [packages/application/src/management/templates/material-items/save-template-material-items-section.ts](packages/application/src/management/templates/material-items/save-template-material-items-section.ts) → mirror for WOMI section save.
- Send-unit snapshot stamping: [packages/domain/src/flooring/products/item-send-unit-snapshot.ts](packages/domain/src/flooring/products/item-send-unit-snapshot.ts) → reused verbatim.
- Cut-log worker shape: [apps/worker/src/processors/pending-save-cut-log-batch.ts](apps/worker/src/processors/pending-save-cut-log-batch.ts) → adapt for WOMI-scoped multi-inventory variant.
- Outbox helper: `createQueueOutboxEvent` at [packages/db/src/queues/outbox-repository.ts:86](packages/db/src/queues/outbox-repository.ts).
- PDF rendering: `renderHtmlToPdf` from `@builders/pdf` at [packages/pdf/](packages/pdf/).
- Bucket storage: `uploadBucketObject` / `getBucketObject` / `createBucketObjectPresignedUrl` at [packages/lib/src/storage.ts](packages/lib/src/storage.ts).
- Cut-log linkage symmetry: `assertCutLogLinkageSymmetry` at [packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:81](packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts).
- New module pattern (engine-free) reference: [apps/web/modules/imports/](apps/web/modules/imports/), with primitives at `apps/web/{transport,controllers,query-policies}/`.

---

## Sub-sweep order

```
7a. Schema      — add WOMI.status enum (single commit, alone per CLAUDE.md)
7b. Domain      — primary tweaks + lock-rules + material-items subdir + cut-log-batch payload
7c. Domain      — file-gen HTML builder + queue payload
7d. Data        — primary + material-items + files repos + WOMI cut-log link writers
7e. Application — primary WO use cases (create / update / delete)
7f. Application — material-items use cases (section save) + WOMI cut-log batch + finalize + void use cases
7g. Application — file-gen producer + consumer
7h. Worker/Relay— register WOMI cut-log worker + file-gen worker; new BullMQ queues
7i. API         — sectional routes (primary, material-items, cut-logs, files, options)
7j. Engine off  — migrate WO module off shared/engines/record-view onto apps/web/{transport,controllers,query-policies}
7k. Module dir  — list, primary section, MI section with cut-log expandable row, files section
7l. Pages       — dashboard list / create / detail
```

Each sub-sweep ships behind its own execution log under `a-branch/session-N/` per CLAUDE.md. Schema (7a) is committed alone; bug-fix bundles allowed elsewhere.

---

## 7a — Schema

**Change:** Add `status` enum to `FlooringWorkOrderItem`.

```prisma
enum FlooringWorkOrderItemStatus {
  IDLE
  SAVING_CUTS
  FINALIZING
  FAILED
}

model FlooringWorkOrderItem {
  // ... existing fields
  status  FlooringWorkOrderItemStatus  @default(IDLE)
}
```

**Migration:** `20260429_add_work_order_item_status` — `ALTER TABLE flooring_work_order_item ADD COLUMN "status" "FlooringWorkOrderItemStatus" NOT NULL DEFAULT 'IDLE'` plus enum creation.

**Apply via:** `npm run db:deploy --workspace @builders/db` (= `npx prisma migrate deploy`) against Railway staging using `.env`.

**Verification:** `npx prisma migrate status` exit 0; `npm run build --workspace @builders/db` green.

---

## 7b — Domain (primary + material-items)

**`packages/domain/src/flooring/work-orders/`:**

| File | Change |
|---|---|
| [types.ts](packages/domain/src/flooring/work-orders/types.ts) | Surface `status` in `WorkOrderListRow` + `WorkOrderDetail`. Surface `templateSyncedAt`, `templateSyncMode`, `templateSnapshotHash` (read-only) on `WorkOrderDetail`. `WorkOrderForm` excludes `status` + sync fields (worker-controlled). |
| [form-rules.ts](packages/domain/src/flooring/work-orders/form-rules.ts) | `validateWorkOrderForm` requires `propertyId` + `warehouseId`. |
| [delete-rules.ts](packages/domain/src/flooring/work-orders/delete-rules.ts) | No-op (existing). WO delete unlinks cut logs via Prisma — no domain rule needed. |
| `lock-rules.ts` (NEW) | `assertWorkOrderWarehouseChangeAllowed({ currentWarehouseId, nextWarehouseId, hasLinkedCutLogs })` → throws `WORK_ORDER_WAREHOUSE_LOCKED`. |
| [normalizers.ts](packages/domain/src/flooring/work-orders/normalizers.ts) | Surface `status` + sync snapshots in normalized output. |
| [error-messages.ts](packages/domain/src/flooring/work-orders/error-messages.ts) | Add warehouse-locked, cut-log-write-failed, file-gen-failed messages. |

**`packages/domain/src/flooring/work-orders/material-items/` (NEW subdir, mirrors templates):**

```
material-items/
├── index.ts
├── types.ts            WorkOrderMaterialItemRow (includes `status`), WorkOrderMaterialItemForm, EMPTY_..._FORM
├── rules.ts            validateWorkOrderMaterialItemForm (productId + quantity > 0)
├── normalizers.ts      normalizeWorkOrderMaterialItem (carries sendUnit snapshot + status + sourceTemplateItemId)
├── diff-rules.ts       Draft/Update/Delete/Diff types + USER_EDITABLE_FIELDS + validateWorkOrderMaterialItemsDiff
└── status-rules.ts     assertWorkOrderItemStatusTransition (e.g. SAVING_CUTS → IDLE valid; SAVING_CUTS → FINALIZING blocked)
```

**Cut-log payloads (`packages/domain/src/queue/`):** TWO new payloads (void is sync — no payload).

| File (NEW) | Topic |
|---|---|
| `save-work-order-item-pending-cut-log-diff.ts` | `flooring.work-order-item.pending-cut-log.save`. Payload `{ version: "v1", topic, workOrderId, workOrderItemId, requestedBy, requestedAt, requestKey, diff: { drafts[], updates[], deletes[] } }`. PENDING rows only — no finalize, no void. Constants `SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_TOPIC / _QUEUE / _JOB_NAME`. |
| `finalize-work-order-cut-log-batch.ts` | `flooring.work-order.cut-log.finalize`. Payload `{ version: "v1", topic, workOrderId, requestedBy, requestedAt, requestKey, cutLogIds: string[] }` — IDs may span multiple WOMIs and inventories under the WO. Constants `FINALIZE_WORK_ORDER_CUT_LOG_BATCH_TOPIC / _QUEUE / _JOB_NAME`. |

**Void uses no queue payload** — synchronous use case invoked directly from API.

---

## 7c — Domain (file generation)

**`packages/domain/src/flooring/work-orders/file-generation/` (NEW):**

| File | Purpose |
|---|---|
| `types.ts` | `WorkOrderFileGenerationInput` — joined shape: WO row + property snapshot + WOMIs + cut-logs grouped per WOMI. Read-only; consumed by HTML builder. |
| `build-work-order-pdf-html.ts` | Pure projection from input → HTML string. No I/O. PDF rendered from this by the worker via `@builders/pdf`. |

**Queue payload (`packages/domain/src/queue/generate-work-order-file.ts`):** `flooring.work-order.file-generation.requested`. Payload `{ version: "v1", topic, workOrderId, fileId, requestedBy, requestedAt }`. Mirrors `void-cut-log.ts` shape.

---

## 7d — Data

**`packages/db/src/flooring/work-orders/`:**

| File | Purpose |
|---|---|
| `shared.ts` (rewrite) | `workOrderListSelect` + `workOrderDetailSelect`. Detail includes status + sync snapshots + items (with status + sendUnit) + files + property (joined including `instructions`). |
| `read-repository.ts` (rewrite) | `listWorkOrders`, `getWorkOrderById`, `getWorkOrderDetailById`, `listWorkOrderOptions`, `getWorkOrderForFileGeneration` (joined shape feeding the PDF builder), `countWorkOrderCutLogs(workOrderId)` for warehouse-change-lock. |
| `write-repository.ts` (rewrite) | `createWorkOrder`, `updateWorkOrder`, `deleteWorkOrderById`, `markWorkOrderStatus(id, status, tx)`. `UpdateWorkOrderInput` omits `status` + sync snapshots. |

**`packages/db/src/flooring/work-orders/material-items/` (NEW):**

| File | Purpose |
|---|---|
| `read-repository.ts` | `listWorkOrderMaterialItems(workOrderId)`. Select includes `sendUnitName/Abbrev`, `status`, `sourceTemplateItemId`. `countCutLogsByWorkOrderItemIds(ids) → Map<itemId, count>`. `listEligibleInventoryForWorkOrderItem(workOrderId, workOrderItemId)` — filters `warehouseId === wo.warehouseId AND productId === womi.productId AND (startingStock - totalCutSum) > 0`. |
| `write-repository.ts` | `WriteWorkOrderMaterialItemInput = WorkOrderMaterialItemForm & ItemSendUnitSnapshot`. `createWorkOrderMaterialItemRecord`, `updateWorkOrderMaterialItemRecord`, `deleteWorkOrderMaterialItemRecordById`, `applyWorkOrderMaterialItemsDiff` (mirrors templates AND nulls `cut_log.workOrderId + workOrderItemId` on deletedIds inside the same TX before WOMI delete — keeps `assertCutLogLinkageSymmetry` satisfied). `markWorkOrderItemStatus(id, status, tx)`. |

**`packages/db/src/flooring/work-orders/files/` (NEW):**

| File | Purpose |
|---|---|
| `read-repository.ts` | `listWorkOrderFiles(workOrderId)`, `getWorkOrderFileById`. |
| `write-repository.ts` | `createWorkOrderFile` (status=QUEUED), `markWorkOrderFileWorking`, `markWorkOrderFileCompleted({ fileKey, completedAt })`, `markWorkOrderFileFailed({ errorMessage })`, `deleteWorkOrderFile`. |

**`packages/db/src/flooring/work-orders/cut-logs/` (NEW):**

| File | Purpose |
|---|---|
| `read-repository.ts` | `listCutLogsForWorkOrderItem(workOrderItemId)`, `getInventoriesForCutLogDiff(diff)` — extracts unique inventoryIds the diff touches (joins existing rows + draft inventoryIds). |
| `write-repository.ts` | `lockInventoriesForCutLogBatch(tx, inventoryIds: string[])` — sorts ascending, runs single `SELECT id FROM flooring_inventory WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE`. `applyWorkOrderItemCutLogDiff(tx, input)` — creates/updates/deletes cut logs with linkage stamped (workOrderId + workOrderItemId both set). `recomputeAndPersistTotalCutSums(tx, inventoryIds)` — per inventory, recompute totalCutSum from cut logs, write back, assert within startingStock. |

**Outbox:** reuse `createQueueOutboxEvent` from [packages/db/src/queues/outbox-repository.ts](packages/db/src/queues/outbox-repository.ts).

---

## 7e — Application (primary)

**`packages/application/src/flooring/work-orders/` (NEW):**

| File | Purpose |
|---|---|
| `create-work-order.ts` | Validate, write, return detail. |
| `update-work-order.ts` | Read current → validate form → if `warehouseId` in patch, fetch `countWorkOrderCutLogs` and call `assertWorkOrderWarehouseChangeAllowed` → write. |
| `delete-work-order.ts` | Direct delete. Prisma SetNull cascade unlinks cut logs. No app-side null updates needed. |
| `types.ts` | `CreateWorkOrderUseCaseInput = CreateWorkOrderRecordInput` (alias). Same for Update. |

---

## 7f — Application (material items + cut logs)

**`packages/application/src/flooring/work-orders/material-items/` (NEW):**

| File | Purpose |
|---|---|
| `create-work-order-material-item.ts` | Load product → `buildItemSendUnitSnapshotFromProduct` → write with `status: IDLE`. |
| `update-work-order-material-item.ts` | Same as templates — re-snapshot send-unit if productId changes. |
| `delete-work-order-material-item.ts` | TX: null cut-log links for this WOMI's id → delete WOMI. (Section save aggregates this; standalone delete also supported.) |
| `save-work-order-material-items-section.ts` | Diff fan-out mirrors templates: distinct productIds → batch-fetch → snapshot-stamp → call `applyWorkOrderMaterialItemsDiff`. The data-layer write nulls cut-log links inside the TX for any deleted WOMI. |

**`packages/application/src/flooring/work-orders/cut-logs/` (NEW):** THREE use cases, mirroring inventory-side triad.

| File | Purpose |
|---|---|
| `save-work-order-item-pending-cut-log-diff.ts` | **Producer (pending diff).** API → use case. Validate WOMI exists. `markWorkOrderItemStatus(id, SAVING_CUTS)`. Compute affected inventoryIds from diff. Write outbox event with idempotency key `wo-pcl-diff:${workOrderItemId}:${requestKey}`. Return `{ accepted: true, jobId }`. |
| `apply-work-order-item-pending-cut-log-diff.ts` | **Consumer (worker calls).** TX: `lockInventoriesForCutLogBatch(allInventoryIds)` → revalidate diff → apply pending creates/updates/deletes with linkage stamped (workOrderId + workOrderItemId both set on every draft) → `recomputeAndPersistTotalCutSums` → `markWorkOrderItemStatus(id, IDLE)`. On throw: TX-fail mark WOMI `FAILED`, re-throw `WorkOrderCutLogExecutionError`. All-or-nothing per batch. |
| `finalize-work-order-cut-log-batch.ts` | **Producer (finalize batch).** API → use case. Read cut log rows by ID, derive set of touched WOMIs + inventories. Validate every row is currently `PENDING` and pre-finalize predicate passes (`canFinalizeCutLog` + `getCutLogFinalizabilityBlocker` from existing inventory cut-log domain). For each touched WOMI: `markWorkOrderItemStatus(id, FINALIZING)`. Write outbox event with key `wo-cl-finalize:${workOrderId}:${requestKey}`. |
| `apply-finalize-work-order-cut-log-batch.ts` | **Consumer (worker calls).** TX: lock all touched inventories → revalidate finalize predicates per row (defensive) → flip `isFinal=true` + `finalCutSequence` per row in deterministic order → `recomputeAndPersistTotalCutSums(touchedInventories)` → for each touched WOMI: `markWorkOrderItemStatus(id, IDLE)`. On throw: mark all touched WOMIs `FAILED`. |
| `void-work-order-cut-log.ts` | **SYNC use case (no worker, no outbox).** Called directly by API DELETE route. TX: lock single inventory → read row → assert `canVoidCutLog` → apply `buildVoidedCutLogPatch` → recompute totalCutSum → commit. Returns the voided row. **No WOMI status change** (per locked decision #1). |

**Idempotency key strategy:** API request body carries a client-generated `requestKey` (UUID v4). Use case folds it into the outbox `idempotencyKey` so a duplicate submit silently dedupes. Void route uses standard mutation receipt (`enforceMutationReceipt` / `finalizeMutationReceipt`) — no separate request key needed since no outbox involved.

---

## 7g — Application (file generation)

**`packages/application/src/flooring/work-orders/files/` (NEW):**

| File | Purpose |
|---|---|
| `request-work-order-file.ts` | **Producer.** TX: compute `fileNumber` (max+1), insert `FlooringWorkOrderFile` at `status=QUEUED`, mark WO `status=QUEUED`, write outbox event. Idempotency key: `wo-file-gen:${workOrderId}:${fileId}`. Returns `{ fileId }`. |
| `generate-work-order-file.ts` | **Consumer.** TX1: lock the file row + mark `status=WORKING`. Read joined data via `getWorkOrderForFileGeneration`. Build HTML via domain helper. Render PDF via `renderHtmlToPdf`. Upload via `uploadBucketObject`. TX2: mark `status=COMPLETED`, persist `fileKey`, mark WO `status=COMPLETED`. On error: mark file `status=FAILED` + persist `errorMessage`, mark WO `status=FAILED`. Throw `WorkOrderFileGenerationError`. |
| `delete-work-order-file.ts` | Synchronous: read row → delete bucket object → delete file row. |

---

## 7h — Worker / Relay / Queue registration

| File (NEW) | Purpose |
|---|---|
| `apps/relay/src/dispatch/build-save-work-order-item-pending-cut-log-dispatcher.ts` | Polls `flooring.work-order-item.pending-cut-log.save` outbox → BullMQ queue `flooring-work-order-item-pending-cut-log-diff`. |
| `apps/relay/src/dispatch/build-finalize-work-order-cut-log-dispatcher.ts` | Polls `flooring.work-order.cut-log.finalize` outbox → BullMQ queue `flooring-work-order-cut-log-finalize`. |
| `apps/relay/src/dispatch/build-work-order-file-generation-dispatcher.ts` | Polls `flooring.work-order.file-generation.requested` → BullMQ queue `flooring-work-order-file-generation`. |
| `apps/worker/src/processors/save-work-order-item-pending-cut-log-diff.ts` | Thin shim — parse, call `applyWorkOrderItemPendingCutLogDiffUseCase`, classify. |
| `apps/worker/src/processors/finalize-work-order-cut-log-batch.ts` | Thin shim — parse, call `applyFinalizeWorkOrderCutLogBatchUseCase`, classify. |
| `apps/worker/src/processors/work-order-file-generation.ts` | Thin shim — parse, call `generateWorkOrderFileUseCase`, classify. |

**Three new BullMQ queues + dispatchers + processors total** (void has no worker — sync route). Bootstrap registers all of them at the worker + relay entrypoints.

**Worker env:** ensure `AWS_*` bucket env vars are present on the Railway worker service (they're documented in `.env.example`).

---

## 7i — API routes

**`apps/web/app/api/work-orders/` (NEW):**

| Route | Method | Calls |
|---|---|---|
| `route.ts` | GET (list) + POST (create) | `listWorkOrders` / `createWorkOrderUseCase` |
| `_validators.ts` | — | `validateCreateWorkOrderInput`, `validateUpdateWorkOrderInput` (Update Omits `status` + sync snapshots), `validateWorkOrderMaterialItemsDiff`, `validateWorkOrderItemCutLogBatchInput` |
| `[id]/route.ts` | DELETE | `deleteWorkOrderUseCase` |
| `[id]/primary/section/route.ts` | PATCH | `updateWorkOrderUseCase` with `assertExpectedUpdatedAt` guard |
| `[id]/material-items/section/route.ts` | PATCH | `saveWorkOrderMaterialItemsSectionUseCase` |
| `[id]/material-items/[itemId]/pending-cut-logs/section/route.ts` | PATCH | `saveWorkOrderItemPendingCutLogDiffUseCase` (producer — pending diff per WOMI) |
| `[id]/cut-logs/finalize/route.ts` | POST | `finalizeWorkOrderCutLogBatchUseCase` (producer — spans WOMIs under this WO) |
| `[id]/cut-logs/[cutLogId]/route.ts` | DELETE | `voidWorkOrderCutLogUseCase` (SYNC, no worker) |
| `[id]/files/route.ts` | POST | `requestWorkOrderFileUseCase` (producer) |
| `[id]/files/[fileId]/route.ts` | DELETE | `deleteWorkOrderFileUseCase` |
| `[id]/files/[fileId]/download/route.ts` | GET | Returns presigned URL via `createBucketObjectPresignedUrl` |
| `options/route.ts` | GET | Form options (properties, warehouses, jobTypes, managementCompanies, templates, productOptions, categoryOptions for the product-filter dropdown) |
| `[id]/material-items/[itemId]/eligible-inventory/route.ts` | GET | `listEligibleInventoryForWorkOrderItem` |

All mutation routes use the standard mutation lifecycle (`parseMutationEnvelope` → `enforceMutationReceipt` → use case → `finalizeMutationReceipt`) per `apps/web/app/CLAUDE.md`.

---

## 7j — Engine off-ramp

**Goal:** wipe the existing `apps/web/modules/work-orders/` tree and rebuild on the engine-free pattern that `apps/web/modules/imports/` already follows.

| Step | Action |
|---|---|
| 1 | Delete the entire `apps/web/modules/work-orders/` tree (record/panel, list, controllers, components — all of it). |
| 2 | Recreate empty canonical shape: `components/{list,record/{primary,material-items,files}}/`, `controllers/`, `data/`. |
| 3 | New controllers import from `apps/web/transport/` (request helpers + `withMutationMeta`), `apps/web/controllers/` (list-view primitives), `apps/web/query-policies/` (rate-limit). NO imports from `modules/shared/engines/record-view/`. |
| 4 | New `data/queries.ts` thin-wraps `@builders/db` reads. `data/mutations.ts` wraps API endpoints from 7i. |

**Acceptance:** grep `modules/work-orders/.*from "@/modules/shared/engines"` → 0 matches.

---

## 7k — Module dir (UI)

**Components:**

| Path | Component |
|---|---|
| `components/list/work-orders-table.tsx` | List columns: workOrderNumber, propertyName, warehouseName, jobTypeName, isComplete, status (file-gen badge), scheduledFor, description, createdAt, updatedAt |
| `components/list/work-orders-toolbar.tsx` | Filters + create button |
| `components/record/primary/primary-fields-section.tsx` | Form: workOrderNumber (RO), property (link), template (link RO + sync icon top-right per intent), managementCompany, jobType, warehouse, isComplete (checkbox), vacancy, scheduledFor, unitNumber, unitType, customAddress (over property address), property.streetAddress/city/state/postalCode (RO derived cells), property.instructions (RO derived cell), description, notes, status (RO worker-controlled badge), createdAt + updatedAt (RO) |
| `components/record/material-items/material-items-section.tsx` | Templates-style grid: product (with category filter dropdown), quantity (with sendUnit suffix), notes. Each row expandable to show cut logs. WOMI status badge per row. |
| `components/record/material-items/cut-log-expandable-row.tsx` | Edit-mode toggle. Add-pending control with eligible-inventory dropdown (single warehouse + product, non-zero stock). Inline cells: cut, isWaste, notes (cost + freight HIDDEN per locked decision). Per-WOMI rows disabled while that WOMI status ≠ IDLE. Void button per final row (sync — no disable on click, just spinner). |
| `components/record/material-items/finalize-selection-toolbar.tsx` | WO-scoped (renders above the MI grid when in "finalize mode"). Checkbox column appears on every PENDING cut-log row across all WOMIs. "Cancel" exits selection mode. "Finalize selected" submits cutLogIds[] to the finalize route. Disabled if any selected row's WOMI is currently non-IDLE. |
| `components/record/files/files-section.tsx` | Grid: fileNumber, status badge, createdAt, completedAt, errorMessage. Generate button at top. Per-row download (presigned URL via 7i route — opens in browser print-view). Per-row delete (sync). |

**Controllers:**

| Path | Hook |
|---|---|
| `controllers/use-work-orders-list-controller.ts` | List + filters + sort |
| `controllers/use-work-order-primary-section.ts` | Primary section save |
| `controllers/use-work-order-material-items-section.ts` | MI diff-save (mirrors `use-template-material-items-section.ts`) |
| `controllers/use-work-order-item-pending-cut-logs.ts` | Per-WOMI: pending cut log diff-save (drafts/updates/deletes). Polls WOMI status until SAVING_CUTS → IDLE/FAILED. |
| `controllers/use-work-order-cut-log-finalize.ts` | WO-scoped: maintains "finalize selection" state across all WOMI cut-log rows in the section. POSTs cutLogIds[] to finalize route. Polls touched WOMI statuses until FINALIZING → IDLE/FAILED. |
| `controllers/use-work-order-cut-log-void.ts` | Single-row sync void. DELETE call returns voided row, controller patches local state. No polling. |
| `controllers/use-work-order-files-section.ts` | File request + delete + download URL fetch |

**Data:**

| Path | Purpose |
|---|---|
| `data/queries.ts` | Thin wraps over `@builders/db` reads |
| `data/mutations.ts` | Per-section HTTP helpers |

---

## 7l — Dashboard pages

| Page | Purpose |
|---|---|
| `apps/web/app/dashboard/work-orders/page.tsx` | SSR list — loads via `data/queries.ts` |
| `apps/web/app/dashboard/work-orders/new/page.tsx` | Create panel |
| `apps/web/app/dashboard/work-orders/[id]/page.tsx` | Detail / record view |

---

## Verification

Per sub-sweep, gate before advancing:

| Sub-sweep | Gate |
|---|---|
| 7a | `npx prisma migrate status` → "up to date"; `npm run build --workspace @builders/db` exit 0 |
| 7b–7c | `npm run typecheck --workspace @builders/domain` exit 0 |
| 7d | `npm run typecheck --workspace @builders/db` exit 0 |
| 7e–7g | `npm run typecheck --workspace @builders/application` exit 0 |
| 7h | `npm run build --workspace @builders/relay && npm run build --workspace @builders/worker` exit 0 |
| 7i | `npm run typecheck --workspace @builders/web 2>&1 \| grep "^app/api/work-orders"` → 0 lines |
| 7j | `grep -r "@/modules/shared/engines" apps/web/modules/work-orders/` → 0 matches |
| 7k–7l | `npm run typecheck --workspace @builders/web` exit 0; manual smoke per below |

**Manual smoke (after 7l):**
1. Create WO → primary section saves clean.
2. Save material items → diff applies, send-unit snapshots stamped, each row at status `IDLE`.
3. Open a WOMI → add 2 pending cut logs spanning 2 inventories → submit pending diff → WOMI status flips `SAVING_CUTS` → `IDLE`. Verify both inventories' `totalCutSum` updated.
4. Enter finalize-selection mode → check pending cut logs across 2 different WOMIs → click Finalize → both WOMIs flip `FINALIZING` → `IDLE`. Verify `isFinal=true` on selected rows.
5. Void a final cut log (single row, sync) — confirm DELETE returns immediately, row visually transitions to voided state, WOMI status NEVER changes. Verify totalCutSum on the affected inventory recomputed.
6. Request file → status `QUEUED` → `WORKING` → `COMPLETED`. Download — opens PDF showing WO + WOMIs + cut logs grouped per WOMI. Verify property instructions appear (live read).
7. Delete file → bucket object + file row gone.
8. Delete WOMI that has cut logs → cut logs survive with both link columns null. Verify `assertCutLogLinkageSymmetry` not violated.
9. Delete WO → all WOMIs cascade-deleted; cut logs survive with both link columns null (Prisma SetNull).
10. Try to change warehouse on WO with cut logs → blocked with `WORK_ORDER_WAREHOUSE_LOCKED`.

---

## Out of scope (explicit)

| Item | Where it lands |
|---|---|
| Inventory record-view cut-log section take-down + worker decommission | Sweep AFTER this one |
| Cut log de-link from WO (manual unlink without void) | Later sweep |
| Auto-assign cut logs to WOMIs by worker | Later sweep |
| Template-sync UI flow (the sync-icon top-right action) | Separate sweep |
| Inventory module touches | Out — this sweep only reads inventory |
| Cost + freight inheritance from inventory on WO-side cuts | Permanently omitted from WO surface |

---

## Critical files to modify (summary)

**New (created in sweep):**
- `packages/domain/src/flooring/work-orders/{lock-rules.ts,material-items/*,file-generation/*}`
- `packages/domain/src/queue/{save-work-order-item-cut-log-batch.ts,generate-work-order-file.ts}`
- `packages/db/src/flooring/work-orders/{material-items/*,files/*,cut-logs/*}`
- `packages/application/src/flooring/work-orders/{*.ts,material-items/*,cut-logs/*,files/*}`
- `apps/relay/src/dispatch/build-{save-work-order-item-cut-log,work-order-file-generation}-dispatcher.ts`
- `apps/worker/src/processors/{save-work-order-item-cut-log-batch,work-order-file-generation}.ts`
- `apps/web/app/api/work-orders/**`
- `apps/web/app/dashboard/work-orders/**`
- `apps/web/modules/work-orders/**` (after wiping existing)

**Rewritten:**
- `packages/db/src/flooring/work-orders/{shared.ts,read-repository.ts,write-repository.ts}`
- `packages/domain/src/flooring/work-orders/{types.ts,form-rules.ts,normalizers.ts,error-messages.ts}`
- `packages/db/prisma/schema.prisma` (add WOMI status enum)

**Wiped + recreated:**
- `apps/web/modules/work-orders/` (entire tree)

---

## Open questions — RESOLVED

All four resolved during plan finalization:

| # | Question | Answer |
|---|---|---|
| 1 | Eligible-inventory dropdown source | **Dedicated route, fetched on demand.** `GET [id]/material-items/[itemId]/eligible-inventory`. |
| 2 | Cut-log batch idempotency key | **Client-generated UUID** per submit, passed through API. |
| 3 | Voiding all cut logs of a WOMI status implication | **No status change for void.** Voiding (single-row, sync) does not flip WOMI status. WOMI enum drops `VOIDING`. |
| 4 | WOMI `FAILED` retry semantics | **Unblockable on retry** — new producer request resets via standard transition. |
| 5 | Cut-log use case granularity | **Three use cases**: pending diff (worker, per-WOMI), finalize batch (worker, spans WOMIs), void (sync, single row). Mirrors inventory-side triad. |
