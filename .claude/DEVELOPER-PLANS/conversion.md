# Conversion Column — Inventory, Adjustments & Staged Import Rows

## Context

Every inventory row is measured in one **stock unit** that can never change (carpet in
LF, plank in boxes/SF, etc.), and its balance flows through immutable adjustments. Users
need a **second translation of that balance** riding alongside the row — e.g. carpet's
`balance × 1.33 = square yards`, plank's `balance × coveragePerUnit = boxes` — that they
can reference or bill from, and freely tweak. This is a stored, editable "Conversion"
setup on inventory and adjustments (and seeded onto staged import rows so it materializes
forward), independent of the frozen stock unit.

The repo already left the door open for this: `FlooringProduct.coverageUnitId` is a dormant
FK commented *"anchor for the future coverage/conversion feature"*, and
`FlooringProduct.coveragePerUnit Decimal(12,4)` is live. This work extends that seam
**downstream** onto rows, and makes it **editable** (unlike the frozen `unitId`).

**Decisions (locked with user):**
1. **Store factor + target unit + a hand-editable converted amount.** Each row stores
   `coveragePerUnit` (factor, seeded from product), `coverageUnitId` (target-unit FK,
   seeded from product), and `conversionAmount` (editable override).
2. **`conversionAmount` is null-means-auto.** NULL ⇒ display the live computed value
   (`balance × coveragePerUnit`); once the user types a number it persists as an explicit
   override. So untouched rows auto-recompute as the balance changes; overridden rows stick.
3. **Naming = `coveragePerUnit` + `coverageUnitId`** (1:1 parity with the product source, so
   the seed maps field-to-field), plus `conversionAmount` for the override. User-facing
   column/label = **"Conversion"**.
4. **Scope this pass:** `FlooringInventory`, `FlooringInventoryAdjustment`,
   `FlooringImportStagedInventoryRow`, and the shared `ProductOption` seed contract. WO
   Requested-Material items + templates are **deferred** (they reuse this groundwork later).

**Editability contract:**
| Surface | coveragePerUnit / coverageUnitId | conversionAmount |
|---|---|---|
| Inventory | editable on **create + update** | editable on create + update |
| Adjustment | **stamped at create** from parent inventory, editable on update | null at create, editable on update |
| Staged row | seeded from product on-select, editable while **DRAFT**, materialized → inventory | null (auto), editable while DRAFT |

> The two **SACRED adjustment create modals** (`inventory-adjustment-create-modal.tsx`,
> `work-order-adjustment-create-modal.tsx`) are **NOT edited** — adjustment coverage is
> stamped server-side from the parent inventory at create; the editable cells live only in
> the adjustment **edit** form.

---

## Data-model shape (all three tables)

```
coveragePerUnit   Decimal? @db.Decimal(12,4)   -- factor; seeded from product.coveragePerUnit
coverageUnitId    String?                       -- FK -> flooring_unit_of_measure; seeded from product.coverageUnitId
coverageUnit      FlooringUnitOfMeasure? @relation("<Table>CoverageUnit", ...)
conversionAmount  Decimal? @db.Decimal(12,2)   -- override; NULL = auto (balance × factor)
@@index([coverageUnitId])
```

On-read the normalizer stamps a resolved display value:
`conversionValue = conversionAmount ?? (balance × coveragePerUnit)` (string), plus raw
`conversionAmount` (for the editable cell) and `coverageUnitName`/`coverageUnitAbbrev`
(from the join). For adjustments the auto value uses `quantity` in place of `balance`.

New `FlooringUnitOfMeasure` back-relations: `inventoryCoverageUnits`,
`adjustmentCoverageUnits`, `stagedCoverageUnits`.

---

## Layer-by-layer plan

Follows the `/column-new-string` spine (schema → domain → data → application → api →
module-UI → client-save-payload → tests). The live **`FlooringProduct.coveragePerUnit` /
`coverageUnitId`** pair is the edit-for-edit template — trace it and mirror it.

### 1. Schema + migration — `packages/db/prisma/schema.prisma`
- Add the 3 columns + `coverageUnit` relation + `@@index` to `FlooringInventory` (~307-373),
  `FlooringInventoryAdjustment` (~452-519), `FlooringImportStagedInventoryRow` (~375-404).
- Add the 3 back-relations to `FlooringUnitOfMeasure` (~232-249).
- **Author the matching SQL migration file** (per repo rule) — nullable, no backfill,
  double-quoted identifiers, one new migration folder. **User runs migrations, never Claude.**

### 2. Domain — `packages/domain/src/inventory/` (+ `adjustments/`, `products/`, `imports/`)
- **Compute (`inventory/computed.ts`):** add pure helpers
  `computeConversionValue({ balance | quantity, coveragePerUnit })` (× factor, null-safe) and
  `resolveConversionValue({ conversionAmount, ... })` (`conversionAmount ?? computed`). Reuse
  `parseInventoryDecimal` / `toInventoryFixedString` (`formatters.ts`) — no new number stack.
- **Create contract (`inventory/create-rules.ts`):** add `coveragePerUnit`, `coverageUnitId`,
  `conversionAmount` to `CreateInventoryEdits`, `CreatedInventoryInsertFields`,
  `validateCreateInventoryEdits` (optional/non-negative, mirror `parseCoveragePerUnit`
  leniency), and **`buildCreatedInventoryInsert`** (the enumerated payload builder — one of the
  three drop-traps).
- **Editability (`inventory/editability.ts` + `types.ts` `InventoryForm` 68-73):** add the 3
  fields to the editable-on-update subset (today only location/internalNotes/isArchived/color).
- **Row types (`inventory/types.ts` `InventoryRow`):** add `coveragePerUnit`,
  `coverageUnitId`, `coverageUnitName`, `coverageUnitAbbrev`, `conversionAmount`,
  `conversionValue` (all strings). Same for `adjustments/types.ts` `InventoryAdjustmentRow`
  and `imports/staged-inventory-rows/types.ts` `StagedInventoryRow` (+ `EMPTY_STAGED_INVENTORY_FORM`).
- **Option contract (`products/types.ts` `ProductOption` 104-115):** add `coveragePerUnit`,
  `coverageUnitId`, `coverageUnitName`, `coverageUnitAbbrev` so on-select seeding can read them.
- `column-limits.ts` / `export-columns.ts`: add limits + a "Conversion" CSV column where lists export.

### 3. Data — `packages/db/src/{inventory,inventory/adjustments,imports/staged-inventory-rows,products}/`
- **Selects (`shared.ts`):** add `coveragePerUnit`, `coverageUnitId`,
  `coverageUnit { id, name, abbreviation }`, `conversionAmount` to `inventoryRowSelect`,
  `adjustmentRowSelect`, the staged-row select, and — **critically** — to
  `products/shared.ts` `productOptionSelect` (74-86), which currently stops at `unit`.
- **Read normalizers:** stamp the resolved conversion in `normalizeInventoryRow`
  (`inventory/read-repository.ts` 63-111, alongside `computeInventoryBalance`), the adjustment
  normalizer, the staged-row normalizer, and `normalizeProductOption`
  (`products/read-repository.ts` 196-210).
- **Write repos:** add the 3 fields to `insertInventoryRow` `data:{}` (185-218, drop-trap #2),
  `materializeStagedRowsToInventory` (260-317) + `MaterializeInventoryRowFields`/
  `InsertInventoryRowInput`, and the editable `buildUpdateData` (86-97). Adjustments:
  `insertPendingAdjustmentRow` (stamp coveragePerUnit/coverageUnitId from parent inventory,
  110) + `updatePendingAdjustmentRow` (make the 3 editable). Staged: create/update writers.

### 4. Application — `packages/application/src/inventory/` (+ `adjustments/`, `imports/`)
- **`create-inventory.ts`:** guard the new `coverageUnitId` exists (reuse `guardUnitsExist` /
  `getUnitOfMeasureById`, 59-70) when present; `buildCreatedInventoryInsert` already carries it.
- **`update-inventory.ts` + `types.ts`:** thread the 3 editable fields into `UpdateInventoryInput`
  and the update use case (they join location/internalNotes/isArchived/color).
- **`adjustments/create-pending-adjustment.ts` (122-125):** stamp `coveragePerUnit` +
  `coverageUnitId` from the loaded inventory beside `unitId`. **`update-pending-adjustment.ts`:**
  merge the 3 editable fields.
- **`imports/staged-inventory-section/save-import-staged-inventory-section.ts` (183-262) +
  `materialize-imported-rows.ts` (82-105):** carry the 3 fields on staged build and copy them
  forward verbatim into inventory at materialize (beside `unitId` at :90). Guard coverageUnitId
  existence with the existing unit guard.

### 5. API — `apps/web/app/api/{inventory,adjustments,imports}/_validators.ts`
- **`validateCreateInventoryInput` (420-436) + `validateUpdateInventoryInput` (399-410):** add
  the 3 fields (drop-trap #3 — a field missing here is silently dropped, typecheck won't catch).
  Mirror `parseCoveragePerUnit` (`api/products/_validators.ts` 36-45) for the factor;
  a `parseConversionAmount` (2dp, non-negative, blank→null) for the amount.
- **Adjustments:** add the 3 to the **update** validator only (create is the sacred modal path —
  no new client fields at create).
- **Imports:** add the 3 to the staged-row form + section-diff validators.

### 6. Module UI — `apps/web/modules/{inventory,adjustments,imports}/`
- **Seeding seam (`inventory/components/record/create/inventory-create-client.tsx`
  `handleProductSelected` 70-75):** beside the existing `setField("unitId", ...)`, add
  `setField("coveragePerUnit", option?.coveragePerUnit ?? "")` and
  `setField("coverageUnitId", option?.coverageUnitId ?? "")` (+ coverage-unit label state).
- **Create form state (`controllers/record/create/use-inventory-create-section.ts`):** add the
  3 fields to `InventoryCreateForm`, `EMPTY_CREATE_FORM`, and the hand-enumerated `isDirty`
  (105-119) — client drop-trap.
- **Record + create fields:** add a **"Coverage / Unit"** `NumberCell`, a **"Conversion Unit"**
  `UnitOfMeasurePicker`, and a **"Conversion"** amount `NumberCell` (showing the computed
  `conversionValue` as its placeholder when `conversionAmount` is blank). Mirror the product
  template exactly — `products/.../product-primary-fields-section.tsx:190-218`. Apply to
  `inventory-create-fields.tsx`, `primary/inventory-primary-fields-section.tsx`, and the
  adjustment **edit** form (`components/record/adjustments/adjustment-edit-form-fields.tsx`).
- **List columns + row-cell:** add a read-only **"Conversion"** column (`conversionValue` +
  `coverageUnitAbbrev`) to inventory + adjustments list column defs and row-cell switches.
- **Staged grid (`imports/components/record/staged-inventory/import-staged-inventory-grid.tsx`
  + `controllers/record/staged-inventory/`):** add DRAFT-editable coverage/conversion cells;
  seed on product-select via the group seed (`drafts.ts createImportStagedRowDraft` 153-173,
  `StagedRowProductSeed` 91-99) and `use-import-filter-rows.ts` unit-seed path (reuse the
  `apply-unit-seed.ts` pattern). Filter (planned-import) rows: **deferred**.

### 7. Tests — `apps/web/tests/modules/` + `packages/*/…`
- Save-payload **mapping tests** for the 3 client/domain enumerated builders (the drop-traps):
  `InventoryCreateForm → CreateInventoryInput`, `buildCreatedInventoryInsert`, staged-row build.
- Domain unit tests for `computeConversionValue` / `resolveConversionValue` (null factor, null
  override → auto, non-null override → stick, zero balance).
- Validator tests for `parseConversionAmount` + coverage passthrough on create & update.

---

## Critical files (representative)
- `packages/db/prisma/schema.prisma` — 3 tables + `FlooringUnitOfMeasure` back-relations + migration.
- `packages/domain/src/inventory/{computed,create-rules,editability,types,formatters}.ts`
- `packages/domain/src/inventory/adjustments/types.ts`; `.../products/types.ts` (`ProductOption`)
- `packages/db/src/{inventory,inventory/adjustments,imports/staged-inventory-rows,products}/{shared,read-repository,write-repository}.ts`
- `packages/application/src/inventory/{create-inventory,update-inventory,types}.ts`;
  `.../inventory/adjustments/{create,update}-pending-adjustment.ts`;
  `.../imports/staged-inventory-section/save-import-staged-inventory-section.ts` + `materialize-imported-rows.ts`
- `apps/web/app/api/{inventory,adjustments,imports}/_validators.ts`
- `apps/web/modules/inventory/components/record/create/inventory-create-client.tsx` (seed) +
  `.../controllers/record/create/use-inventory-create-section.ts` (form/isDirty)
- `apps/web/modules/inventory/components/record/primary/inventory-primary-fields-section.tsx`,
  `.../record/create/inventory-create-fields.tsx`, `.../record/adjustments/adjustment-edit-form-fields.tsx`
- List: `.../inventory/components/list/table/{inventory-list-columns.ts,inventory-row-cell.tsx}`
  + adjustments equivalents.
- Staged: `apps/web/modules/imports/components/record/staged-inventory/import-staged-inventory-grid.tsx`
  + `controllers/record/staged-inventory/{drafts.ts,use-import-filter-rows.ts}`.

## Do-not-touch
- `inventory-adjustment-create-modal.tsx`, `work-order-adjustment-create-modal.tsx` (SACRED).
- The frozen stock `unitId` on any table — immutable, unchanged.

---

## Verification
1. `npm run check` (`/check-gauntlet`) — build, typecheck, lint, test all green.
2. **Migration:** author the SQL; ask the user to run `db:deploy` (shared dev DB) before UI testing.
3. **Inventory create:** pick carpet → confirm `coveragePerUnit` + Conversion Unit auto-seed
   from the product; the **Conversion** cell shows `balance × factor`; type a factor and an
   override amount → Create → record page shows the stored values.
4. **Inventory update:** edit factor / unit / override on an existing row → Save → refetch
   persists; clear the override → Conversion falls back to the live computed value; run an
   adjustment that changes balance → an un-overridden row's Conversion recomputes.
5. **Adjustment:** create via the (untouched) modal → row inherits inventory's factor+unit,
   Conversion auto = `quantity × factor`; open the **edit** form → override → persists.
6. **Staged import:** seed a staged row from a product → coverage seeds; mark for import →
   worker materializes → the new inventory row carries the coverage/conversion forward.
7. **Lists:** the "Conversion" column renders resolved value + unit abbrev on inventory +
   adjustments lists (+ CSV export if wired).

## Deferred / open
- WO Requested-Material items + templates reuse this groundwork (separate pass; user owns templates).
- Planned-import **filter** rows (`FlooringImportStagedInventoryFilterRow`) — not materialized to
  inventory; excluded unless requested.
- Sortable "Conversion" column (a generated stored mirror like `stockQuantity`) — deferred; the
  first pass is display/reference only.
