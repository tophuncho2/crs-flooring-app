# Current Plan — Inventory UX sweep (per-row import status, warehouse editability, column trims, `uncutBalance` → `physicalBalance`)

Companion context: `REFERENCE.md` (full four-module vision), `PHASE-E-F-G-ANALYSIS.md` (sweep 2 routes / modules / dashboard decisions — now landed and green). This plan replaces the now-shipped Sweep 2 content.

---

## Goal

Four tightly-related UX changes to the inventory list view, inventory record view, and the imports record view's inventory-rows section:

1. **Trim inventory list columns.** Drop `importTag` and `transport` columns from the inventory dashboard list. Keep `importNumber` and `importStatus` (now sourced per-row — see #2).
2. **Per-row import status** (new model). Each `FlooringInventory` row owns its own `importStatus`, independent of the parent `FlooringImportEntry.status`. Editable only from the imports record view's inventory-rows section. Displayed read-only on the inventory list view and on the inventory record view's primary fields section.
3. **Warehouse editable + required** on the inventory record view's primary section. A true `<select>` (not a static read-only label) backed by `warehouseOptions`, required to save.
4. **Rename `uncutBalance` → `physicalBalance`** for that specific computed field. UI-facing rename across domain type + DB normalizer + every component that reads it. Not a DB column (field is computed, never persisted).

Each change is scoped to the minimal set of files that participate in its data lifecycle, starting at the domain type and flowing outward through DB → application → routes → modules → dashboard pages as required.

---

## Change 1 — Inventory list view column trim

**Scope.** UI only. No DB, domain, application, or route changes.

### Files to edit

- `apps/web/modules/inventory/components/list/inventory-client.tsx`
  - Delete the `{ key: "importTag", ... }` field definition (currently line 75).
  - Delete the `{ key: "transport", ... }` field definition (currently line 77).
  - Rename the remaining status field label from `"Import Status"` to `"Import Status"` (no change) but change the getter to `(row) => formatImportStatus(row.importStatus)` — `row.importStatus` will now come from the per-row column (Change 2).
- `apps/web/modules/inventory/components/list/inventory-table.tsx`
  - Delete the `importTag` cell renderer (lines 66–70).
  - Delete the `transport` cell renderer (lines 83–94).
  - Remove the now-unused imports `formatImportTransportType as formatTransportType`, `getTransportTypeFieldClass` (the `status` cell still uses `formatImportStatus` + `getImportStatusFieldClass`).

### Blast radius

- None beyond inventory list view. Grouping/sort state stored in `table-preferences` via `useConfiguredTableState` with `tableKey: "inventory-main"` is keyed by column `key`; removed keys silently drop from persisted prefs. Acceptable behaviour (matches warehouses/contacts patterns).
- The table filters file (`components/list/table-filters.ts`) already defines a `status` tabs filter with `"pending" | "final"` values — unchanged. It now filters on the per-row column.

---

## Change 2 — Per-row import status (new model)

Current state: `InventoryRow.importStatus` is derived from the parent `FlooringImportEntry.status` in the DB normalizer (`read-repository.ts:105`). The filter helper `isPendingInventoryRow` reads the same value (`packages/domain/src/flooring/inventory/filters.ts:58`). This change breaks that derivation: each inventory row gets its own column, defaulted to the import's current status at row-creation time, and thereafter edited independently via the imports record view's inventory-rows section.

### Phase A — Database

**Migration:** add column `importStatus String @default("PENDING")` on `FlooringInventory` (`packages/db/prisma/schema.prisma:279`). Back-fill existing rows from `flooring_import_entry.status` where `importEntryId IS NOT NULL`; keep `"PENDING"` for standalone rows.

```sql
ALTER TABLE "flooring_inventory"
  ADD COLUMN "importStatus" TEXT NOT NULL DEFAULT 'PENDING';

UPDATE "flooring_inventory" i
  SET "importStatus" = e."status"
  FROM "flooring_import_entry" e
  WHERE i."importEntryId" = e."id";
```

No new index; the filter is in-memory over `listInventory()` (matches existing pattern for status filter).

### Phase B — Domain (`packages/domain/src/flooring/inventory/`)

- `types.ts` — `InventoryRow.importStatus` is already typed `string` (line 22). Semantics change from "parent's status" to "row's own status." No type signature change, but update the JSDoc if added.
- `diff-types.ts` — add `importStatus?: string` to both `InventoryRowDraft` and `InventoryRowUpdatePatch`. Add an `INVALID_IMPORT_STATUS` validation code to `InventoryDiffValidationIssue` and wire it into `validateInventoryRowsDiff` (reject anything not in `IMPORT_STATUS_VALUES`).
- Re-export the existing `IMPORT_STATUS_VALUES` / `formatImportStatus` from `@builders/domain/flooring/imports/types.ts` for inventory consumers (they already do via the top-level barrel — no barrel change needed).

### Phase C — Data

- `packages/db/src/flooring/inventory/shared.ts` — add `importStatus: true` to `inventoryRowSelect`.
- `packages/db/src/flooring/inventory/read-repository.ts` — in `normalizeInventoryRow`:
  - Replace `importStatus: importEntry?.status ?? ""` (line 105) with `importStatus: payload.importStatus`.
  - Drop `importTag` and `importTransportType` from the return object — these are no longer shown in the list view (Change 1) and the record view (Change 3 removes the read-only row at the top of the primary section too). Confirm grep shows no other consumers before deletion. Keep `importWarehouseId` / `importWarehouseName` since those power the primary-section's warehouse-scope logic.
- `packages/db/src/flooring/inventory/write-repository.ts` — add `importStatus?: string` to `UpdateInventoryInput` and `CreateInventoryInput`. Wire into `buildCreateData` / `buildUpdateData`.
- `packages/db/src/flooring/imports/write-repository.ts` — in `applyImportInventoryRowsDiff`:
  - On added rows (`createMany` block, line 143): persist `importStatus: draft.importStatus ?? "PENDING"` (default for new rows). This keeps the contract that adds don't require the caller to specify a status.
  - On modified rows (`update` block, line 174): forward `patch.importStatus` when present.

### Phase D — Application

- `packages/application/src/flooring/inventory/types.ts` — add `importStatus?: string` to `UpdateInventoryInput` (single-row CRUD).
- `packages/application/src/flooring/inventory/update-inventory.ts` — accept and forward `importStatus`. Validate via `isImportStatus` helper. Note: we're opting **not** to expose this field through the inventory primary-section route — inventory's primary section treats `importStatus` as read-only. But the single-row write path needs to carry it so future flows can patch it if needed. (If we want hard guarantees we add it here and wire it only through the imports diff route — see Phase E.)
- `packages/application/src/flooring/imports/save-inventory-rows.ts` — validation already runs through domain `validateInventoryRowsDiff`; the new `INVALID_IMPORT_STATUS` code surfaces via `describeInventoryDiffIssues`. No other changes.

### Phase E — Routes

- `apps/web/app/api/inventory/_validators.ts` — do **not** accept `importStatus` on the primary-section PATCH body. The primary section is the read-only surface for this field. Leave `validateUpdateInventoryInput` unchanged.
- `apps/web/app/api/imports/_validators.ts` — in `shapeDraft` / `shapePatch`, accept and pass through `importStatus` (optional string). Let domain validation reject invalid values.

### Phase F — Modules

- `apps/web/modules/imports/controllers/drafts.ts`:
  - Add `importStatus: string` to `ImportInventoryRowDraft`.
  - Default to `"PENDING"` in `createImportInventoryRowDraft` for local drafts; read from `item.importStatus` when seeded from a server row. (Add `importStatus` to `ImportInventoryRow` in `packages/domain/src/flooring/imports/types.ts` — that's the row shape used for seeded data; it currently omits `importStatus`.)
- `apps/web/modules/imports/components/record/sections/import-inventory-rows-section.tsx`:
  - Add a new grid column `{ key: "importStatus", minWidth: 140, align: "center", label: "Import Status" }` (before or after `status` — the existing "status" column is the draft/unsaved lifecycle badge and remains).
  - Render a `<RecordGridCellSelect>` bound to `row.importStatus`, options sourced from `IMPORT_STATUS_VALUES.map(v => ({ value: v, label: formatImportStatus(v) }))`.
- `apps/web/modules/imports/controllers/use-import-inventory-rows-section.ts`:
  - Extend `toDraftPayload` to forward `importStatus` on added rows.
  - Extend `toUpdatePatch` to diff `importStatus` (`if (row.importStatus !== existing.importStatus) patch.importStatus = row.importStatus`).
- `apps/web/modules/imports/data/queries.ts` — no change (read-through from `@builders/db`).
- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx`:
  - Add a read-only "Import Status" tile in the left pane (next to Starting Balance / Cut Balance / etc.) rendered via `<RecordStaticFieldValue>`: `{formatImportStatus(inventory.importStatus)}`.

### Blast radius

- **DB write path change.** Every `applyImportInventoryRowsDiff` caller currently omits `importStatus` on drafts — the primitive defaults added rows to `"PENDING"`. Safe.
- **Filter compatibility.** `isPendingInventoryRow` / `matchesInventoryStatusFilter` (`packages/domain/src/flooring/inventory/filters.ts:58`) keep working unchanged since they read `row.importStatus` — the value just comes from a different source.
- **Tests.** `apps/web/tests/modules/products/products-detail-client.test.tsx` fixtures set `importStatus: "PENDING"` directly; keep as-is.
- **Cross-module product record view.** `apps/web/modules/products/components/record/product-inventory-rows-section.tsx` consumes `InventoryRow` — it reads `uncutBalance` (Change 4) but not `importStatus` currently, so no new consumer added here. If the product record view later wants this column, add read-only there too.

---

## Change 3 — Warehouse field editable + required

### Files to edit

- `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx`:
  - Replace the `RecordFormField label="Warehouse"` block that currently renders `<RecordStaticFieldValue>{warehouseName}</RecordStaticFieldValue>` (lines 48–54) with a `<select>` wired to `draft.warehouseId` and `onFieldChange("warehouseId", value)`.
  - Accept a new `warehouseOptions: InventoryWarehouseOption[]` prop; pass it through from `InventoryRecordPanel`.
- `apps/web/modules/inventory/components/record/inventory-record-panel.tsx`:
  - Accept + forward `warehouseOptions` to `InventoryPrimaryFieldsSection`.
- `apps/web/modules/inventory/components/record/inventory-detail-client.tsx`:
  - Accept + forward `warehouseOptions` to `InventoryRecordPanel`.
- `apps/web/app/dashboard/inventory/[id]/page.tsx`:
  - Pull `warehouseOptions` from `listInventoryOptions()` result (already fetched in `getInventoryDetailPageData`, just not returned) — extend `getInventoryDetailPageData` in `apps/web/modules/inventory/data/queries.ts` to include `warehouses` in its return payload, or return the full options bag.
- `packages/domain/src/flooring/inventory/inventory-rules.ts`:
  - Update `validateInventoryInput`: `warehouseId` becomes unconditionally required. Add a new issue code `WAREHOUSE_REQUIRED` (not only `WAREHOUSE_REQUIRED_FOR_LOCATION`). Update `describeInventoryValidationIssue` accordingly. Keep the existing `WAREHOUSE_REQUIRED_FOR_LOCATION` case for a cleaner error message if only location is missing — but since warehouse is now always required, prefer one unified code and drop the location-only variant.
- `packages/application/src/flooring/inventory/update-inventory.ts`:
  - `merged.warehouseId` already falls through `validateInventoryInput` — the domain change cascades. No application code change needed.
- `packages/application/src/flooring/inventory/create-inventory.ts`:
  - Same — validation change cascades.

### Blast radius

- **Existing rows with `warehouseId = NULL`** will fail to save on next primary-section edit until a warehouse is picked. That matches user intent. No migration needed; rows aren't forced to back-fill.
- **Import-rows diff** still accepts null warehouse (source-of-truth stamping from location resolves it). Domain rule applies only to standalone inventory updates where caller is directly editing `warehouseId`.
- **Products record view** (`apps/web/modules/products/components/record/product-inventory-rows-section.tsx`) doesn't call `validateInventoryInput` — read-only grid. Safe.
- **Location scope logic** in `use-inventory-primary-section.ts` (lines 89–95) uses `importWarehouseId || warehouseId` as the scope for location filtering. With warehouse now editable, the scope should prefer `draft.warehouseId`. Update `locationScopeId` to read from the draft state first, falling back to record state, to keep the location dropdown filtered in sync with the warehouse selection.

---

## Change 4 — Rename `uncutBalance` → `physicalBalance`

Rename a single computed field, UI-through-DB-normalizer scope. Field is never persisted, only derived from `stockCount - totalCut` in the inventory read normalizer.

### Files to edit

| Layer | File | Change |
|---|---|---|
| Domain type | `packages/domain/src/flooring/inventory/types.ts:52` | `uncutBalance: string` → `physicalBalance: string` |
| DB normalizer | `packages/db/src/flooring/inventory/read-repository.ts:90, 135` | Rename local var `uncut` → `physical`; field key `uncutBalance: toFixedString(uncut)` → `physicalBalance: toFixedString(physical)` |
| Inventory list column config | `apps/web/modules/inventory/components/list/inventory-client.tsx:84` | key `"uncutBalance"` → `"physicalBalance"`, label `"Uncut Balance"` → `"Physical Balance"` |
| Inventory list cell renderer | `apps/web/modules/inventory/components/list/inventory-table.tsx:125–129` | Rename renderer key + `row.uncutBalance` reference |
| Inventory primary fields | `apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx:77–82` | Label `"Uncut Balance"` → `"Physical Balance"`, field `inventory.uncutBalance` → `inventory.physicalBalance` |
| Products record view | `apps/web/modules/products/components/record/product-inventory-rows-section.tsx:28, 96–97` | Column key `"uncutBalance"` → `"physicalBalance"`, label + `row.uncutBalance` reference |

### Blast radius + naming note

- **No prisma migration** — not a column.
- **No route / validator change** — not transmitted in request bodies.
- **Stored table preferences** keyed by `"uncutBalance"` will silently drop on next load (same column-key behaviour as Change 1).
- **Forward compatibility with Sweep 3.** Sweep 3's categories unit-conversion plan (`docs/sweeps/categories/domain/unit-conversion.md`) introduces `physicalStock = stockCount − (awaitingCutBalance + totalCutBalance)` — a *different* quantity from today's `uncutBalance = stockCount − totalCut` (which only subtracts `FINAL` cuts). This rename resolves the user's UX labelling ask without pre-committing to the Sweep 3 semantic. When Sweep 3 lands, `physicalBalance` is either:
  - re-pointed to Sweep 3's new canonical computation (same name, new math), or
  - renamed again to match whichever name Sweep 3 chooses.
  
  Either way, one field, one rename this sweep. **Flag for reviewer:** confirm Sweep 3 intends `physicalStock` as the name; if so, either stay with `physicalBalance` now and rename in Sweep 3, or pre-adopt `physicalStock` here. Current choice: follow the user's literal instruction (`physicalBalance`).

---

## Execution order

1. **Change 4 (rename)** first — smallest blast radius, purely mechanical rename, establishes a green baseline before schema/semantic changes land.
2. **Change 1 (column trim)** — independent UI tweak, also mechanical.
3. **Change 3 (warehouse editable)** — domain rule + UI prop plumbing, no schema change.
4. **Change 2 (per-row import status)** — single migration + normalizer swap + diff shape extension. The invasive one; save for last so the greener tree makes migration verification cleaner.

Each change is a standalone PR-worthy commit. No change depends on the previous.

---

## Verification gates

- `pnpm -F @builders/domain build && pnpm -F @builders/db build && pnpm -F @builders/application build` — clean after each change.
- `pnpm -F @builders/web typecheck` — error count should only drop (nothing added).
- Regression greps:
  - After Change 1: `grep -rn "importTag\|importTransportType" apps/web/modules/inventory apps/web/modules/imports` → only import-section wiring (the imports record view still shows tag + transport on the primary fields section; those are untouched).
  - After Change 4: `grep -rn "uncutBalance" apps packages` → zero.
  - After Change 2: `grep -rn "importStatus: importEntry" packages/db` → zero.
- Dev smoke:
  - **Inventory list:** import tag + transport columns gone; import status pill still renders from the per-row column.
  - **Inventory record:** warehouse is a dropdown (not a static label), disabled while saving, required to save (clear warehouse → save → validation error "Warehouse is required").
  - **Inventory record:** primary section shows read-only "Import Status" pill reflecting the row's current status.
  - **Imports record inventory-rows section:** new per-row "Import Status" select. Change a row's status → save → verify the per-row value persists and the inventory list view picks it up on next page load.
  - **Cross-check:** changing the *parent* import's status via the imports primary section no longer cascades to inventory rows. Concurrent edits are fine (different row locks).

---

## Open questions flagged to the user

1. **Name collision** — `physicalBalance` (this sweep) vs `physicalStock` (Sweep 3). Do we want to pre-adopt `physicalStock` now to avoid a second rename? Default: use `physicalBalance` per your instruction, accept the possible future rename.
2. **Import status defaulting on add.** Added inventory rows via the imports diff default to `"PENDING"` regardless of the parent import's status. If adds should inherit the parent's current status, change the default in `applyImportInventoryRowsDiff` to read the parent status — cheap, but a semantic choice.
3. **Products record view** currently shows only `uncutBalance` (renamed to `physicalBalance`) from `InventoryRow`. It does **not** show `importStatus`. Add the per-row status column there too, or leave it out? Default: leave out until asked.
