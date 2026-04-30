# Sweep 4a — Application Use Case Rewires Report

## Summary

Rewired 8 application files in `flooring/imports/` and `flooring/inventory/`
against the sweep-1 domain shapes and sweep-2 / sweep-3 data-layer
surfaces, deleted 2 dead use cases (`save-inventory-rows.ts` and
`create-inventory.ts`), and pruned the inventory error union of all
post-migration orphan codes. `npx tsc --noEmit` on
`packages/application` returns **zero errors** (down from 42 cited in the
audit). The new staged-inventory-rows submodule and the worker-facing
materialize / mark-for-import use cases are sweep 4b's territory; this
sweep does not introduce them.

## 1. Per-file delta

| File | Change |
|---|---|
| `packages/application/src/flooring/imports/types.ts` | Replaced `CreateImportInput` to mirror `ImportPrimaryForm` exactly: 5 string fields (`orderNumber`, `tag`, `notes`, `warehouseId`, `manufacturerId`). Dropped `transportType` and `status`. `UpdateImportInput = Partial<CreateImportInput>` unchanged in shape. **Deleted** `SaveImportInventoryRowsResult` and the `ImportDetailRecord` import (no remaining consumers in the file). `ImportResult = ImportRecord` retained. |
| `packages/application/src/flooring/imports/create-import.ts` | `createImport` → `createImportRecord` import. Build site now passes `manufacturerId: emptyToNull(input.manufacturerId)` and drops `transportType` / `status`. Validation block, transaction wrap, warehouse lookup, and use-case signature all unchanged. |
| `packages/application/src/flooring/imports/update-import.ts` | `updateImport` → `updateImportRecord`, `UpdateImportInput as DbUpdateImportInput` → `UpdateImportRecordInput as DbUpdateImportInput`. Dropped `isImportStatus` and `isImportTransportType` domain imports. `toPrimaryForm` no longer references `transportType` / `status`; merges `manufacturerId` analogously to `warehouseId`. `dbInput` builder drops the `isImportStatus` / `isImportTransportType` gating branches. Warehouse re-resolution preserved verbatim. New manufacturerId branch threads `emptyToNull` through. |
| `packages/application/src/flooring/imports/delete-import.ts` | `deleteImportById` → `deleteImportRecordById`, `getImportDeleteState` → `getImportLinkState`. Domain helpers unchanged. The `isImportDeleteBlocked(state)` call accepts the `getImportLinkState` shape directly per sweep 2's design. |
| `packages/application/src/flooring/imports/save-inventory-rows.ts` | **DELETED.** Per the sweep prompt's decision D. The file depended on the missing `applyImportInventoryRowsDiff`, the removed `flooring_inventory.isImported` column, and the removed `InventoryRowUpdatePatch.productId` field. |
| `packages/application/src/flooring/imports/index.ts` | Removed the `export * from "./save-inventory-rows.js"` line. |
| `packages/application/src/flooring/inventory/types.ts` | **Deleted** `CreateInventoryInput`. `UpdateInventoryInput` rewritten as a flat object of optional fields (`itemNumber`, `dyeLot`, `warehouseId`, `locationId`, `notes`, `isArchived`) — drops the `isImported?: boolean` ghost and is no longer a `Partial<CreateInventoryInput>` since the latter is gone. `InventoryResult = InventoryRecord` retained. |
| `packages/application/src/flooring/inventory/errors.ts` | Pruned `InventoryErrorCode` union to 6 codes. Deleted: `INVENTORY_DIFF_VALIDATION_FAILED`, `INVENTORY_PRODUCT_NOT_FOUND`, `INVENTORY_STALE_ROW_VERSION`, `IMPORTED_REVERSAL_NOT_ALLOWED`, `INVENTORY_PENDING_IMPORT`, `CUT_LOG_INVENTORY_NOT_IMPORTED` (sweep-3 reserved), `CUT_LOG_EXCEEDS_STARTING_BALANCE` (sweep-3 reserved). Class shape unchanged. |
| `packages/application/src/flooring/inventory/create-inventory.ts` | **DELETED.** Per the sweep prompt's decision: workers materialize, no user-facing create path. |
| `packages/application/src/flooring/inventory/update-inventory.ts` | `updateInventory` → `updateInventoryRecord`, `UpdateInventoryInput as DbUpdateInventoryInput` → `UpdateInventoryRecordInput as DbUpdateInventoryInput`. Domain imports replaced: `describeInventoryValidationIssues` → `describeInventoryFormValidationIssues`, `validateInventoryInput` → `validateInventoryForm`. **Deleted** `isImportedReversal` (no replacement). **Deleted** the `current.isImported` gate and the `current.stockCount` reference. **Deleted** the productId re-resolution block (productId is not in `INVENTORY_EDITABLE_FIELDS`). New body: load current → derive merged warehouseId / locationId → re-resolve warehouse / location only if the relevant id changed (or when warehouse changed and location stayed) → call domain `validateInventoryForm({ warehouseId, locationId }, location)` with the resolved location → build `dbInput` with the editable subset → call `updateInventoryRecord`. Source-of-truth re-stamp (location changed but no warehouseId in patch ⇒ `dbInput.warehouseId = resolvedLocation.warehouseId`) preserved verbatim. |
| `packages/application/src/flooring/inventory/delete-inventory.ts` | `deleteInventoryById` → `deleteInventoryRecordById`. `getInventoryDeleteState` import unchanged (still exported). Use case body unchanged otherwise. |
| `packages/application/src/flooring/inventory/index.ts` | Removed the `export * from "./create-inventory.js"` line. |

## 2. Files deleted

- **`packages/application/src/flooring/imports/save-inventory-rows.ts`** — depended on `applyImportInventoryRowsDiff` (does not exist; only `applyStagedInventoryRowsDiff` exists), selected the removed `flooring_inventory.isImported` column, and read `InventoryRowUpdatePatch.productId` (field removed). Per decision D, the entire imports-side inventory-rows diff path is dead — sweep 4b's `markStagedRowsForImportUseCase` and the worker-facing `materializeImportedStagedRowsUseCase` will subsume the user flow that this file was attempting to handle.
- **`packages/application/src/flooring/inventory/create-inventory.ts`** — depended on the removed `createInventory` data primitive and the removed domain helpers `describeInventoryValidationIssues` and `validateInventoryInput`. There is no user-facing inventory-create path post sweep 1: workers materialize inventory rows from staged rows. The use case was a half-built migration artifact.

## 3. Symbols deleted from existing files

**From `imports/types.ts`:**
- `CreateImportInput.transportType` (field)
- `CreateImportInput.status` (field)
- `SaveImportInventoryRowsResult` (type alias)
- `ImportDetailRecord` (import — was only used by the deleted result alias)

**From `imports/update-import.ts`:**
- `isImportStatus` (domain import)
- `isImportTransportType` (domain import)
- `input.transportType` / `input.status` reads (the `toPrimaryForm` body branches)
- `current.transportType` / `current.status` reads
- `dbInput.transportType` / `dbInput.status` writes (the gated assignment branches)

**From `inventory/types.ts`:**
- `CreateInventoryInput` (type)
- `UpdateInventoryInput.isImported` (field — was a ghost; no underlying column)

**From `inventory/errors.ts`:**
- `INVENTORY_DIFF_VALIDATION_FAILED` (code — sole consumer was the deleted `save-inventory-rows.ts`)
- `INVENTORY_PRODUCT_NOT_FOUND` (code — sole consumer was the productId re-resolve branch in `update-inventory.ts`, now gone)
- `INVENTORY_STALE_ROW_VERSION` (code — sole consumer was the deleted `save-inventory-rows.ts`)
- `IMPORTED_REVERSAL_NOT_ALLOWED` (code — gated on the removed `isImported` column)
- `INVENTORY_PENDING_IMPORT` (code — gated on the removed `isImported` column)
- `CUT_LOG_INVENTORY_NOT_IMPORTED` (sweep-3 reserved code — moved out per plan §11 option (a); cut-log application sweep owns this)
- `CUT_LOG_EXCEEDS_STARTING_BALANCE` (sweep-3 reserved code — same rationale)

**From `inventory/update-inventory.ts`:**
- `describeInventoryValidationIssues` (domain import — renamed to `describeInventoryFormValidationIssues`)
- `validateInventoryInput` (domain import — renamed to `validateInventoryForm`)
- `isImportedReversal` (domain import — no longer exists)
- `getProductById` import (was used only by the deleted productId re-resolve)
- `current.isImported` gate block
- `current.stockCount` read
- `input.productId` re-resolution block
- `input.isImported` writes to `dbInput`

**From `inventory/delete-inventory.ts`:**
- `deleteInventoryById` import (renamed)

**From `imports/create-import.ts`:**
- `createImport` import (renamed)
- `input.transportType` and `input.status` writes to the data primitive

## 4. Build results

```
$ npm run build --workspace=packages/application
> @builders/application@0.1.0 build
> tsc -p tsconfig.json
```

Succeeded cleanly. No warnings, no errors. `dist/` refreshed.

## 5. tsc diff vs baseline

### `packages/application` only

```
$ cd packages/application && npx tsc --noEmit
(no output)
```

**Zero errors.** All 42 errors enumerated in the audit's §10.1 are resolved.

### Monorepo `tsc -b`

Sweep-3 baseline: **188 errors across 40 files.**
Post sweep-4a: **170 errors across 37 files.**

Net delta: **−18 errors, −3 files.** All resolved errors were in
`packages/application/`. Top-5 file profile (worker, work-order panel,
inventory table) is largely unchanged; sweep 4a's deletions did surface
new fallout in `apps/web/app/api/...` route-side code, partially offset
by the `packages/application` cleanup.

### Apps/web fallout from this sweep (expected — sweep 5's inventory)

Direct, sweep-induced new errors (each is a stale import or a stale
field reference now exposed because the application surface changed):

| File | Error (abridged) | Cause |
|---|---|---|
| `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts:2` | `'@builders/application' has no exported member 'saveImportInventoryRowsUseCase'` | use case deleted (decision D) |
| `apps/web/app/api/inventory/route.ts:2` | `'@builders/application' has no exported member named 'createInventoryUseCase'` | use case deleted |
| `apps/web/app/api/inventory/_validators.ts:2` | `'@builders/application' has no exported member named 'CreateInventoryInput'` | type deleted |
| `apps/web/modules/inventory/data/mutations.ts:6` | `'@builders/application' has no exported member named 'CreateInventoryInput'` | same |
| `apps/web/app/api/imports/_validators.ts:40,51,52` | `transportType` / `status` not assignable to `CreateImportInput` / `Partial<CreateImportInput>` | fields dropped from `CreateImportInput` |
| `apps/web/app/api/imports/_validators.ts:63,76,88,100,113` | `INVENTORY_DIFF_VALIDATION_FAILED` not assignable to `InventoryErrorCode` (×5) | code removed from union |
| `apps/web/app/api/imports/_validators.ts:137` | `Property 'isImported' does not exist on type 'InventoryRowDraft'` | column / field removed |

The `apps/web/app/api/imports/_validators.ts` file went from 8 errors (sweep 3 baseline) to 16 (post sweep 4a). The 8 added errors are the `INVENTORY_DIFF_VALIDATION_FAILED` references (×5), the two `transportType` / `status` references, and the `isImported` property reference — all flowing from this sweep's intentional surface changes.

The `apps/worker/src/application/process-work-order-auto-allocation.ts` errors (`processWorkOrderAutoAllocationRunUseCase`, `WorkOrderAutoAllocationAttemptContext`) are unchanged from sweep 3 — out of scope for this sweep.

## 6. Symbol reachability

```
$ node -e "import('@builders/application').then(m => console.log(
  typeof m.createImportUseCase,
  typeof m.updateImportUseCase,
  typeof m.deleteImportUseCase,
  typeof m.updateInventoryUseCase,
  typeof m.deleteInventoryUseCase,
  'createInventoryUseCase removed:', m.createInventoryUseCase === undefined,
  'saveImportInventoryRowsUseCase removed:', m.saveImportInventoryRowsUseCase === undefined
))"

function function function function function createInventoryUseCase removed: true saveImportInventoryRowsUseCase removed: true
```

All 5 retained use cases reachable as `function`. Both deleted use cases return `undefined` (exhausted).

## 7. Deviations from the plan

1. **`update-inventory.ts` location-resolution order.** The prompt sketched "load current → merge → validate → optionally re-resolve warehouse / location → build dbInput → call updateInventoryRecord." I re-resolved the warehouse and location *before* the domain validator call rather than after. Reason: the validator (`validateInventoryForm`) takes a `LocationLookup | null` parameter so it can flag `LOCATION_WAREHOUSE_MISMATCH` on the merged warehouseId / location pair. Resolving the location after validation would make that branch unreachable. The application-side existence checks (`INVENTORY_WAREHOUSE_NOT_FOUND`, `INVENTORY_LOCATION_NOT_FOUND`) still throw before the validator runs, which matches the prior file's existence-check-first ordering. This is an order tweak, not a behavioral change.

2. **`UpdateInventoryInput` is a flat object literal, not `Partial<CreateInventoryInput>`.** The plan said `Partial<CreateInventoryInput>` but `CreateInventoryInput` is being deleted in this same sweep. The flat object preserves the same surface (each field is optional, types match `InventoryForm`). The result is functionally equivalent and avoids the cyclical reference to a deleted type.

3. **`emptyToNull` applied to `itemNumber` patches in update-inventory.** The plan didn't explicitly call this out, but the data-layer `UpdateInventoryRecordInput.itemNumber?: string | null` accepts `null` and the convention in the prior file used `emptyToNull` for trimmed-empty inputs. I matched the prior convention so a UI submitting `""` clears the field rather than writing the empty string.

4. **`create-import.ts` warehouse lookup remains pre-create.** The prompt says "Update the call site to use `createImportRecord(input, c)`. Verify the input shape matches the new `CreateImportRecordInput`." It didn't explicitly say to keep the pre-create warehouse lookup, but the lookup is a 404 guard that the prior file did before calling the data primitive. Removing it would let Prisma throw a P2025 / referential failure that the application layer doesn't currently translate. Per the prompt's "**Don't add translation in this sweep**" rule, I kept the explicit lookup.

5. **`update-inventory.ts` no longer imports `getProductById`.** The plan said to drop the productId re-resolution block; the import was therefore unused and was removed. Same logic for the unused `validateInventoryInput` import — replaced with `validateInventoryForm`.

6. **Inventory error pruning was more aggressive than the plan's literal list.** The plan called out `IMPORTED_REVERSAL_NOT_ALLOWED` and `INVENTORY_PENDING_IMPORT` for deletion plus the two sweep-3-reserved codes. I additionally deleted `INVENTORY_DIFF_VALIDATION_FAILED`, `INVENTORY_PRODUCT_NOT_FOUND`, and `INVENTORY_STALE_ROW_VERSION` — every code whose sole producer was either the deleted `save-inventory-rows.ts` or the deleted productId-resolve branch in `update-inventory.ts`. The remaining union (6 codes) is exactly the codes thrown by the two surviving use cases. Sweep 4b can re-introduce any code it needs (e.g., `STAGED_*` codes will live in `staged-inventory-rows/errors.ts`).

## 8. Remaining work flagged for sweep 4b

- **New module:** `packages/application/src/flooring/imports/staged-inventory-rows/` with `errors.ts`, `types.ts`, `create-...`, `update-...`, `delete-...`, `save-inventory-rows-section.ts`, `mark-for-import.ts`, `index.ts`. Mirror the precedent at `packages/application/src/management/templates/material-items/`.
- **Worker-facing use case:** `materializeImportedStagedRowsUseCase` consuming `parseImportMaterializeBatchPayload` + `markStagedRowsForImport` + `materializeStagedRowsToInventory`. Establishes the precedent for use cases that own the full `withDatabaseTransaction` envelope on the worker side.
- **Outbox-write use case:** `markStagedRowsForImportUseCase` — first application use case that calls `createQueueOutboxEvent` (currently zero callers anywhere). Establishes the producer-side outbox precedent.
- **`expectedUpdatedAt` discipline on `markStagedRowsForImportUseCase`** — the prior `saveImportInventoryRowsUseCase` had a per-row staleness check; sweep 4b decides whether to port that pattern or rely on the data-layer batch primitive's own conditional `WHERE`.
- **Outbox payload symbol:** `IMPORT_MATERIALIZE_TOPIC` and `parseImportMaterializeBatchPayload` from `@builders/domain` are sweep 4b's payload contract.
- **Error code prefix:** `STAGED_INVENTORY_ROW_*` or `STAGED_*` — sweep 4b establishes the prefix. There is no precedent yet (the sweep-4 audit §8.3 confirms zero existing `STAGED_*` codes).

## 9. Remaining work flagged for sweep 5

API routes and modules consuming the deleted use cases / dropped fields, with specific file paths:

**Routes that import deleted use cases:**
- `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts` — imports `saveImportInventoryRowsUseCase`. Either delete the route entirely (cleanest, since the staged-row diff endpoint will live elsewhere) or rewire to a sweep 4b use case once that lands.
- `apps/web/app/api/inventory/route.ts` (POST handler) — imports `createInventoryUseCase`. Per the sweep prompt's decision: workers materialize, no user-create endpoint. Delete the POST handler. The GET handler (if any) is independent.

**Routes / modules that import deleted types:**
- `apps/web/app/api/inventory/_validators.ts:2` — imports `CreateInventoryInput`. Delete the validator block tied to POST.
- `apps/web/modules/inventory/data/mutations.ts:6` — imports `CreateInventoryInput`. Delete the create mutation.

**Routes that reference dropped fields on the import surface:**
- `apps/web/app/api/imports/_validators.ts:40, 51, 52` — references `transportType` / `status` on `CreateImportInput` / `Partial<CreateImportInput>`. Drop both.
- `apps/web/app/api/imports/_validators.ts:63, 76, 88, 100, 113` — emits `INVENTORY_DIFF_VALIDATION_FAILED` (×5 sites). The code is removed; the validator block is also dead because it's the staged-row diff validator that goes away with the route.
- `apps/web/app/api/imports/_validators.ts:129, 137` — type mismatches in the staged-row draft assembly (`isImported`, `string | null` vs `string`). Tied to the same dead diff validator path.

**Modules that read `transportType` / `status` from `ImportRow` / `ImportPrimaryForm`:**
- `apps/web/modules/imports/components/list/imports-table.tsx` (7 errors per `tsc -b`)
- `apps/web/modules/imports/components/record/sections/import-primary-fields-section.tsx` (7 errors)
- `apps/web/modules/imports/data/queries.ts` (8 errors)
- `apps/web/modules/imports/controllers/use-import-inventory-rows-section.ts` (18 errors)

These were already broken before sweep 4a (the audit's §10 confirms the same files in the sweep-3 baseline). They remain broken; sweep 4a did not regress or improve them. The fix is column-by-column UI cleanup against the new domain shapes.

**Worker:**
- `apps/worker/src/application/process-work-order-auto-allocation.ts` — still imports two non-existent symbols from `@builders/application` (`processWorkOrderAutoAllocationRunUseCase`, `WorkOrderAutoAllocationAttemptContext`). Out of scope for this sweep and for sweep 4b unless work-order allocation is in scope. Remains a separate concern.
