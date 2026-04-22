# Pre-flight — Sweep 3 foundation

**Purpose.** Before any Sweep-3 work begins, verify the Sweep-2 foundation is still intact AND apply two additive hardening rules that Sweep 3 depends on. Read-only verification for items 1–6; items 7–8 may require small code changes if Sweep 2 didn't already cover them.

Run this checklist in order. Any drift or missing coverage: fix in place → rebuild affected packages → re-check → proceed to Phase 1.

---

## Sweep-2 verification (read-only)

### 1. Import primary `status` stays editable (original Sweep-2 Change 6)
- `apps/web/modules/imports/components/record/sections/import-primary-fields-section.tsx` — `<select>` with PENDING/FINAL.
- `apps/web/modules/imports/components/list/imports-table.tsx` — status column renders via `formatImportStatus` + `getImportStatusFieldClass`.
- `grep -rn "importEntry\.status\|row\.importStatus" apps packages | grep -v dist | grep -v node_modules` → zero hits outside the imports module itself.

### 2. Per-row `isImported` pipeline intact
- Domain: `InventoryRow.isImported: boolean`; `importTag`/`importStatus`/`importTransportType` absent; `isImportedReversal`, `assertImportedTransitionAllowed`, `IMPORTED_REVERSAL_NOT_ALLOWED` exported.
- Domain diff: `InventoryDiffValidationIssue` includes `IMPORTED_REVERSAL_NOT_ALLOWED`.
- Application: `update-inventory.ts` throws `IMPORTED_REVERSAL_NOT_ALLOWED` on true→false; `save-inventory-rows.ts::toDiffExisting` forwards `isImported`.
- Data: `inventoryRowSelect` drops `importEntry.tag/status/transportType`; `InventoryListFilter.isImported?: boolean` supported; `importInventorySelect` includes `isImported`; `applyImportInventoryRowsDiff` persists `isImported` on create + update with `?? input.importWarehouseId` warehouse fallback.
- Routes: `validateUpdateInventoryInput` does NOT accept `isImported`; `optionalDiffBoolean` passes `isImported` through imports diff.
- Modules: `use-import-inventory-rows-section.ts` exports `setRowImportStatus`; `import-inventory-rows-section.tsx` renders per-row status select with `disabled={row.isImported}`.

### 3. Inventory list eligibility filter
- `apps/web/modules/inventory/data/queries.ts::loadInventoryPageData` calls `listInventory({ isImported: true })`.

### 4. Inventory record edit gates
- `inventory-primary-fields-section.tsx` — `isReadOnly = !inventory.isImported`; inputs disabled; banner when read-only.
- `inventory-record-panel.tsx` — footer omits `onDelete` when read-only.
- `update-inventory.ts` — refuses updates via `INVENTORY_PENDING_IMPORT` when `current.isImported === false`.
- `inventory-cut-logs-section.tsx` — empty-state swap when pending.

### 5. Warehouse required on inventory primary
- Domain `validateInventoryInput` pushes `WAREHOUSE_REQUIRED` when `warehouseId` missing.
- `getInventoryDetailPageData` returns `warehouseOptions`; page forwards it.
- Primary section renders `<select required>` for warehouse.

### 6. Warehouse auto-link on import-diff added rows
- `applyImportInventoryRowsDiff` has `?? input.importWarehouseId` fallback on both branches.

---

## Sweep-3 hardening (apply if missing)

### 7. Inventory `cost` / `freight` — editable only from imports record view, pre-import confirmation

**Rule.** `FlooringInventory.cost` and `FlooringInventory.freight` are only writable through the imports record view's inventory-rows section, and only while the row has `isImported === false`. Once a row flips to `isImported = true`, its `cost` / `freight` are locked forever. The inventory record view never exposes these fields as editable.

**Rationale.** Cut logs snapshot `cost` and `freight` on create. If inventory cost can change after import confirmation, the snapshot-vs-current spread grows unbounded. Locking cost/freight at import-confirm time eliminates the drift: every cut against a row sees the same numbers the row was received with. No accounting surprises.

**Checklist.**
- **Imports record view inventory-rows section** — `cost` and `freight` cells remain editable on rows where `isImported === false`. On rows where `isImported === true`, the cells render read-only (matches the "one-way transition" pattern for `isImported` itself).
- **Inventory record view primary section** — `cost` and `freight` are NOT present as inputs. If they currently render as editable inputs, convert them to `RecordStaticFieldValue` read-only tiles. If they're absent from the section, leave them absent.
- **Route `apps/web/app/api/inventory/[id]/primary/section/route.ts`** — `validateUpdateInventoryInput` does NOT accept `cost` or `freight`. Strip these keys at the validator (matches the Sweep-2 pattern of dropping `isImported` here).
- **Route `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts`** — `validateImportInventoryRowsDiff` accepts `cost` and `freight` on added rows AND on modified rows whose pre-diff `isImported === false`. If modified diff targets a row with `isImported === true` and a `cost` or `freight` value is present in the patch, reject with `400 INVALID_BODY` citing the locked fields.
- **Application `save-inventory-rows` use case** — enforce the same invariant in domain (`isInventoryCostLocked(row) = row.isImported === true`). Throw `INVENTORY_COST_LOCKED_POST_IMPORT` if a patch touches cost/freight on a confirmed row. Keeps the data-layer dumb; the business rule lives in domain + application.

**Verify with:**
- `grep -n "cost\|freight" apps/web/app/api/inventory/_validators.ts` — no accepted keys for `cost` or `freight` in the primary-section validator.
- `grep -n "cost\|freight" apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx` — present only in `RecordStaticFieldValue` tiles (display) or absent entirely. No `<input>` / `<select>` / controller setters for these fields.
- Dev smoke: create a PENDING inventory row via imports → set `cost = 100`, `freight = 20`, save → flip row to FINAL via imports → attempt to edit `cost` from the inventory record view → no input surface; direct API patch with `cost` in body → 400.

### 8. Inventory `freight` reaches the validators

**Rule.** Sweep 2 added `isImported` plumbing. Confirm `freight` is already a first-class input on the inventory-rows diff path (added rows + modified pre-import rows), since the cut-log compute depends on it.

**Checklist.**
- `apps/web/app/api/imports/_validators.ts` — `shapeDraft` and `shapePatch` accept `freight` as optional decimal string (alongside `cost`).
- `packages/domain/src/flooring/inventory/` — diff shaper includes `freight` on `InventoryRowDraft` + `InventoryRowUpdatePatch`.
- `packages/db/src/flooring/imports/write-repository.ts` — `applyImportInventoryRowsDiff` persists `freight` on create + update.
- Spot check: create an import row with `freight = 25.50` → save → row in DB carries `freight: 25.5`.

---

## Exit condition

All eight sections green. Any gap discovered in items 7 or 8 is a discrete commit (or two) before Phase 1 of the sweep begins.

Expected wall-clock:
- Items 1–6: ~15 min read-through if nothing regressed.
- Item 7: 30–60 min if any of the cost/freight gates are missing (route validator + UI change + domain rule + use-case check).
- Item 8: 5 min verification; longer only if a gap exists.

---

## Pending flags and concerns

None at this time. Items 7 and 8 above are the Sweep-3 hardening additions to the original Sweep-2 verification; all resolved decisions have been folded into the checklist rather than left as open flags.

If new preflight-scoped concerns surface during execution (e.g., a sixth Sweep-2 gate regressed since it last shipped), append here before moving to Phase 1.
