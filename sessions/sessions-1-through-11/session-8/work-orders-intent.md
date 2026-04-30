# Intent — Work Orders Sweep

Status: **PENDING.** Successor to the products + templates verticals. Lands the WO module end-to-end with the patterns those sweeps locked in.

## Context

Schema is ready (migration 02 + `20260428205306_work_order_status_and_files`):
- `FlooringWorkOrder` has `status FlooringWorkOrderStatus @default(IDLE)`, sync snapshot fields (`templateSyncedAt`, `templateSyncMode`, `templateSnapshotHash`), `cutLogs` + `files` back-relations.
- `FlooringWorkOrderItem` has `sendUnitName/Abbrev` (mirrors templates), `sourceTemplateItemId` for template-sync linkage.
- `FlooringWorkOrderFile` model is in place for the file-generation pipeline.

Domain has the bare-bones primary types (`WorkOrderListRow`, `WorkOrderDetail`, `WorkOrderForm`, normalizers, no-op delete-rule, 3 error messages). Everything else — material items, lock rules, file-gen, application use cases, API routes, UI module — does not exist yet.

Tables are truncated, so no data migrations or backfills are needed.

## Scope

| Layer | In sweep | Out of sweep |
|---|---|---|
| Schema | already applied — no changes | |
| Domain — primary tweaks | ✅ status surface, lock rules, sync snapshots on detail, required-fields | |
| Domain — `material-items/` subdir (mirror of templates) | ✅ types, rules, normalizer, diff-rules | |
| Domain — file-gen pieces | ✅ HTML builder + input shape; queue payload | |
| Data — primary repos | ✅ `read-repository.ts`, `write-repository.ts` | |
| Data — material-items repos | ✅ `material-items/{read,write}-repository.ts` | |
| Data — file repos | ✅ `files/read-repository.ts`, `files/write-repository.ts` | |
| Data — outbox helpers for file-gen | ✅ | |
| Application — primary use cases (create/update/delete) | ✅ | |
| Application — material-items use cases (create/update/delete + diff-save) | ✅ | |
| Application — file-gen producer + consumer | ✅ | |
| Relay — file-gen dispatcher | ✅ | |
| Worker — file-gen processor | ✅ | |
| API — sectional routes (primary, material-items, file-gen, options) | ✅ | |
| Module dir — list, primary section, material-items section, files section | ✅ | |
| Dashboard pages — list, create, detail | ✅ | |
| **WOMI cut-log expandable row** | | ❌ deferred — see `a-branch/work-order-material-items/intent.md` |
| Auto-assign worker | | not in scope this sweep |

## Layered breakdown

### Domain — `packages/domain/src/flooring/work-orders/`

**Primary tweaks (existing files):**

| File | Change |
|---|---|
| `types.ts` | Add `status: FlooringWorkOrderStatus` to `WorkOrderListRow` + `WorkOrderDetail`. Add `templateSyncedAt: string`, `templateSyncMode: string`, `templateSnapshotHash: string` (read-only snapshots) to `WorkOrderDetail`. Status excluded from `WorkOrderForm` (worker-controlled). |
| `form-rules.ts` | `validateWorkOrderForm` requires `propertyId` + `warehouseId` (warehouse becomes required vs templates' `propertyId` + `unitType`). |
| `delete-rules.ts` | `isWorkOrderDeleteBlocked({ hasLinkedCutLogs }) → boolean`; `assertWorkOrderDeleteAllowed` throw variant. Reason constant `WORK_ORDER_DELETE_BLOCKED`. |
| `normalizers.ts` | Surface `status` + 3 sync snapshots in `normalizeWorkOrder` / `normalizeWorkOrderListRow`. |
| `error-messages.ts` | Add warehouse-locked, delete-blocked, file-gen messages. |
| `index.ts` | Re-export new files. |

**New files (primary):**

| File | Purpose |
|---|---|
| `lock-rules.ts` | `assertWorkOrderWarehouseChangeAllowed({ currentWarehouseId, nextWarehouseId, hasLinkedCutLogs }) → throws`. Predicate the application primary-section save use case calls before applying a patch. |
| `inventory-eligibility.ts` | `isInventoryEligibleForWorkOrderItem(inventory, workOrder, workOrderItem) → boolean` — same warehouse, same product, `startingStock - totalCutSum > 0`. Pure predicate; consumed when wiring the cut-log expandable row (deferred sweep). Land it now since the data layer needs the same shape for option queries. |

**New subdir (material-items, mirror of templates):**

```
flooring/work-orders/material-items/
├── index.ts
├── types.ts            WorkOrderMaterialItemRow, WorkOrderMaterialItemForm, EMPTY_..._FORM
├── rules.ts            validateWorkOrderMaterialItemForm (productId + quantity > 0)
├── normalizers.ts      normalizeWorkOrderMaterialItem (carries sendUnit snapshot + sourceTemplateItemId)
└── diff-rules.ts       Draft/Update/Delete/Diff types + USER_EDITABLE_FIELDS const + validateWorkOrderMaterialItemsDiff
```

The diff validator adds one cross-row check beyond templates': **delete-blocked when the row has linked non-void cut logs** (per-row delete-lock parallel to the WO-level delete-lock). Data layer hands `hasLinkedCutLogs: boolean` per row.

**New subdir (file generation):**

```
flooring/work-orders/file-generation/
├── types.ts                     WorkOrderFileGenerationInput (read shape — joined WO + items + cut logs grouped per WOMI)
└── build-work-order-pdf-html.ts pure HTML projection from the input
```

**Queue payload** (`packages/domain/src/queue/`):

| File | Topic |
|---|---|
| `generate-work-order-file.ts` (NEW) | `flooring.work-order.file-generation.requested`. Payload `{ version: "v1", topic, workOrderId, fileId, requestedBy, requestedAt }`. Constants: `GENERATE_WORK_ORDER_FILE_TOPIC`, `…_QUEUE`, `…_JOB_NAME`. Mirror `void-cut-log.ts`. |

### Data — `packages/db/src/flooring/work-orders/`

**Primary:**

| File | Purpose |
|---|---|
| `shared.ts` | `workOrderRowSelect` + `workOrderDetailSelect`. Detail surfaces status + sync snapshots + items + files (read shape only — file rows for the files panel). |
| `read-repository.ts` | `listWorkOrders`, `getWorkOrderById`, `getWorkOrderDetailById`, `listWorkOrderOptions`, `getWorkOrderForFileGeneration` (joined shape for the PDF builder), `countWorkOrderCutLogs(workOrderId)` for the WO-level delete-lock + warehouse-change-lock. |
| `write-repository.ts` | `createWorkOrder`, `updateWorkOrder`, `deleteWorkOrderById`, plus status-transition helpers (`markWorkOrderStatus(id, status, …)`). `UpdateWorkOrderInput` omits `status` and the sync snapshot fields (worker-controlled). |

**Material items:**

| File | Purpose |
|---|---|
| `material-items/read-repository.ts` | `listWorkOrderMaterialItems(workOrderId)`. Select includes `sendUnitName/Abbrev` + `sourceTemplateItemId`. Adds `countCutLogsByWorkOrderItemIds(ids) → Map<itemId, count>` for the per-row delete-lock check. |
| `material-items/write-repository.ts` | `WriteWorkOrderMaterialItemInput = WorkOrderMaterialItemForm & ItemSendUnitSnapshot`. `createWorkOrderMaterialItemRecord`, `updateWorkOrderMaterialItemRecord`, `deleteWorkOrderMaterialItemRecordById`, `applyWorkOrderMaterialItemsDiff` (mirrors templates verbatim). |

**Files:**

| File | Purpose |
|---|---|
| `files/read-repository.ts` | `listWorkOrderFiles(workOrderId)`, `getWorkOrderFileById`. |
| `files/write-repository.ts` | `createWorkOrderFile` (insert with `status = QUEUED`), `markWorkOrderFileWorking`, `markWorkOrderFileCompleted({ fileKey, completedAt })`, `markWorkOrderFileFailed({ errorMessage })`, `deleteWorkOrderFile`. |

**Outbox:** reuse the existing `createQueueOutboxEvent` helper from cut-logs side; no new outbox code.

### Application — `packages/application/src/flooring/work-orders/`

**Primary use cases:**

| File | Purpose |
|---|---|
| `create-work-order.ts` | Validate, fetch property, write. |
| `update-work-order.ts` | Reads current → validates form → calls `assertWorkOrderWarehouseChangeAllowed` if `warehouseId` is in patch (passes `hasLinkedCutLogs` from `countWorkOrderCutLogs`) → calls `applyPropertyInstructionsAutofill` if propertyId changed → write. |
| `delete-work-order.ts` | `getProductDeleteState`-equivalent: `countWorkOrderCutLogs` → `assertWorkOrderDeleteAllowed` → delete. |

**Material-items use cases (clones templates verbatim):**

| File | Purpose |
|---|---|
| `material-items/create-work-order-material-item.ts` | Same shape as `create-template-material-item.ts`: load product → `buildItemSendUnitSnapshotFromProduct` → merge → write. |
| `material-items/update-work-order-material-item.ts` | Same as templates. |
| `material-items/delete-work-order-material-item.ts` | Adds: count cut logs for this item → throw if any non-void exist (per-row delete-lock). |
| `material-items/save-work-order-material-items-section.ts` | Same diff-fan-out as templates: distinct productIds → batch-fetch → map snapshots → merge → call `applyWorkOrderMaterialItemsDiff`. Adds: when an item is in the `deleted` array, check its cut-log count; abort with `WORK_ORDER_MATERIAL_ITEM_DELETE_BLOCKED` if any. |

**File-generation use cases:**

| File | Purpose |
|---|---|
| `files/request-work-order-file.ts` | Producer (called by API POST). In a single transaction: compute `fileNumber`, insert file row at `QUEUED`, mark WO `status = QUEUED`, write outbox event. Idempotency key: `work-order-file-gen:${workOrderId}:${fileId}`. |
| `files/generate-work-order-file.ts` | Consumer (called by worker). TX1 lock + mark `WORKING`. Read joined data via `getWorkOrderForFileGeneration`. Build HTML via domain helper. Render PDF via `@builders/pdf`. Upload via `@builders/lib` storage. TX2 mark `COMPLETED` + persist `fileKey`. On any error: TX-fail mark `FAILED` + `errorMessage`; throw `WorkOrderFileGenerationError` for the worker to classify. |
| `files/delete-work-order-file.ts` | Synchronous: read row → delete bucket object → delete file row. |

**Property-instructions autofill:** add `applyPropertyInstructionsAutofill(form, property)` at `packages/domain/src/management/properties/instructions-autofill.ts` (NEW — shared with templates' next-pass adoption). WO primary save calls it on link/relink.

### Outbox / Relay / Worker

| File | Purpose |
|---|---|
| `apps/relay/src/dispatch/build-work-order-file-generation-dispatcher.ts` (NEW) | Polls `flooring.work-order.file-generation.requested` outbox topic, dispatches to BullMQ `flooring-work-order-file-generation` queue. |
| `apps/worker/src/processors/work-order-file-generation.ts` (NEW) | Thin shim — parse payload via `parseGenerateWorkOrderFilePayload`, call `generateWorkOrderFileUseCase`, classify errors. Mirror `void-cut-log.ts` shape. |
| Bootstrap | Register the new BullMQ queue + dispatcher + processor. |
| Worker env | Add bucket credentials (`BUCKET_ACCESS_KEY_ID`, etc.) on the worker service in Railway. |

### API routes — `apps/web/app/api/work-orders/` (NEW)

| Route | Method(s) | Notes |
|---|---|---|
| `route.ts` | GET list + POST create | Validator pair like products: `validateCreateWorkOrderInput` + `validateUpdateWorkOrderInput` (Update Omits `status` + sync snapshots) |
| `_validators.ts` | — | Both validators + diff validator for material-items |
| `[id]/route.ts` | DELETE | Calls `deleteWorkOrderUseCase` |
| `[id]/primary/section/route.ts` | PATCH | Calls `updateWorkOrderUseCase` with `assertExpectedUpdatedAt` guard |
| `[id]/material-items/section/route.ts` | PATCH | Diff endpoint — calls `saveWorkOrderMaterialItemsSectionUseCase` |
| `[id]/files/route.ts` | POST | Calls `requestWorkOrderFileUseCase` (producer) |
| `[id]/files/[fileId]/route.ts` | DELETE | Calls `deleteWorkOrderFileUseCase` |
| `options/route.ts` | GET | Form options (properties, warehouses, jobTypes, managementCompanies, templates, productOptions, categoryOptions) |

### Module dir — `apps/web/modules/work-orders/` (full reshape)

Current state is non-canonical (`list/`, `record/` siblings of `components/`). Reshape to:

```
work-orders/
├── components/
│   ├── list/                  table, columns, toolbar
│   └── record/
│       ├── primary/           primary-fields-section.tsx
│       ├── material-items/    material-items-section.tsx (mirror of templates)
│       └── files/             files-section.tsx (status badges + delete + download)
├── controllers/
│   ├── use-work-orders-list-controller.ts
│   ├── use-work-order-primary-section.ts
│   ├── use-work-order-material-items-section.ts
│   └── use-work-order-files-section.ts
└── data/
    ├── queries.ts             pass-through to @builders/db reads
    └── mutations.ts           per-section HTTP helpers (createWO, updatePrimary, saveMaterialItems, requestFile, deleteFile, deleteWO)
```

The cut-log expandable row inside `material-items-section.tsx` is **deferred** — section ships with read-only cut-log row visibility (count badges) but no edit mode. Edit mode lands in the deferred sweep.

### Dashboard pages — `apps/web/app/dashboard/work-orders/` (NEW)

| Page | Purpose |
|---|---|
| `page.tsx` | List view — SSR loader pulls from `modules/work-orders/data/queries.ts` |
| `new/page.tsx` | Create panel |
| `[id]/page.tsx` | Detail / record view |

## Patterns reused from products + templates

| Pattern | Source | Reuse in WO |
|---|---|---|
| Domain helper `buildItemSendUnitSnapshotFromProduct` | `packages/domain/src/flooring/products/item-send-unit-snapshot.ts` | Verbatim — every WOMI write calls it |
| Data write-input shape `Write{Module}MaterialItemInput = Form & ItemSendUnitSnapshot` | `packages/db/src/management/templates/material-items/write-repository.ts` | Verbatim — `WriteWorkOrderMaterialItemInput` |
| Application orchestration: load product → build snapshot → merge → write | `packages/application/src/management/templates/material-items/{create,update,save}-*.ts` | Verbatim — copy file-by-file with renames |
| Diff use case batch-fetch products | Same — `save-template-material-items-section.ts` | Verbatim |
| API validator split (Create vs Update) + Update Omits worker-controlled fields | `apps/web/app/api/products/_validators.ts` | Same shape — Update omits `status` + sync snapshots (the analogue of products' `categoryId`) |
| Mutation helper `toUpdateRequestBody` strips locked fields | `apps/web/modules/products/data/mutations.ts` | Same — strips `status` + sync snapshots before PATCH |
| Section component readonly cells from snapshot vs live | `product-primary-fields-section.tsx` | Reuse for the WO primary section's status display (always readonly) |
| Quantity cell with send-unit suffix | `template-material-items-section.tsx` | Verbatim — same `productById` lookup, same `<NumberCell>` + suffix span |
| Worker payload + dispatcher + processor | `void-cut-log.ts` + sibling files | Same shape — new topic, new queue name |

## Locked decisions

1. **Required fields** for WO: `propertyId` + `warehouseId` only. (Templates require `propertyId` + `unitType` instead.)
2. **`status` is worker-controlled** — never on `WorkOrderForm`, never accepted in API PATCH validator.
3. **Sync snapshot fields** (`templateSyncedAt`, `templateSyncMode`, `templateSnapshotHash`) are read-only on `WorkOrderDetail`; written only by the template-sync flow (separate sweep).
4. **Warehouse change locked when cut logs exist** — `assertWorkOrderWarehouseChangeAllowed` predicate, reason `WORK_ORDER_WAREHOUSE_LOCKED`.
5. **WO delete locked when cut logs exist** — `assertWorkOrderDeleteAllowed` predicate, reason `WORK_ORDER_DELETE_BLOCKED`.
6. **WOMI delete locked when that item has cut logs** — per-row check inside `validateWorkOrderMaterialItemsDiff`, reason `WORK_ORDER_MATERIAL_ITEM_DELETE_BLOCKED`.
7. **Cut-log linkage symmetry** stays enforced by existing `assertCutLogLinkageSymmetry` (no new domain rule).
8. **WOMI cut-log expandable row deferred** — see `a-branch/work-order-material-items/intent.md`.
9. **File-gen ships in this sweep** with WOMI item rows + cut log group placeholders. PDF reads cut logs that already exist via the inventory-side flow; the deferred sweep adds the WOMI-side cut-log writes.

## Open questions

| # | Question |
|---|---|
| Q1 | Files section UI — add a delete-confirmation modal or inline `X` like cut logs? |
| Q2 | When a WO is in `status = QUEUED` or `WORKING`, lock the primary section (read-only) for that period? Currently the rule is just "warehouse can't change if cut logs exist" — no broader status-based lock. |
| Q3 | Property-instructions autofill helper — confirm it lives at `packages/domain/src/management/properties/instructions-autofill.ts` (shared with templates' future-adoption) vs duplicated in WO domain? |

## Sub-sweeps (proposed order)

```
7a. Domain — primary tweaks + lock-rules + material-items subdir + inventory-eligibility
7b. Domain — file-generation HTML builder + queue payload
7c. Data — primary + material-items + files repos
7d. Application — primary use cases (create/update/delete)
7e. Application — material-items use cases (mirror templates)
7f. Application — file-generation producer + consumer
7g. Outbox / Relay / Worker — file-gen pipeline wired
7h. API — sectional routes (primary, material-items, files, options)
7i. Module dir — list, primary section, material-items section, files section
7j. Dashboard pages — list, create, detail
```

Each lands behind a dedicated execution log under `a-branch/session-N/`. Same pattern as the products + templates verticals.

## Out of scope (explicit)

- WOMI cut-log expandable row mechanics — see `a-branch/work-order-material-items/intent.md`.
- Auto-assign worker (status enum already accommodates a future addition).
- Template-sync UI flow — owned by a separate sweep.
- Inventory module touches — out of scope for WO sweep.

## Verification

- All workspace typechecks → exit 0.
- `npm run build --workspace @builders/db`, `… @builders/application`, `… @builders/web`, `… @builders/relay`, `… @builders/worker` → all exit 0.
- Manual smoke: create WO → save material items → request file → file appears at `COMPLETED` with downloadable bucket key → delete file → delete WO (succeeds when no cut logs, blocks when present).
- Snapshot integrity: every new WOMI row has `sendUnitName/Abbrev` populated from the chosen product.

## Sweep position

```
✅ 1. Schema
✅ 2–5. Products vertical
✅ 6a–6e. Templates vertical + UoM display polish
👉 7. Work orders module — full sweep (this intent)
   8. (Deferred) WOMI cut-log expandable row
```
