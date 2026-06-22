# inventory-adjustments-layout — reorder adjustment columns + close the split-form cell gap

## STOP — plan before you touch anything
You are on a fresh dev-N branch. **Open with `/engine`** (both tasks live in record-view-engine-driven UI). Read the files below, confirm the plan, THEN edit. The code is the source of truth.

## Mission (two small frontend-only changes)
1. **Adjustments tables** — move the **Cost** and **Freight** columns to the **LEFT of the Work Order # (`WO #`)** column.
2. **Inventory split/create form** — the **Roll #**, **Dye Lot**, **Note**, and **Internal Notes** cells each have a gap above them; slide each up two rows to close the gap.

## Scope
**In:** column order in the adjustments list-column definition; grid row placement of the four cells in the inventory create/split fields component.
**Out:** no schema, no domain, no data, no API. Do not change what columns *exist* or what data is fetched — only their **order** (task 1) and **grid placement** (task 2). Do not edit the shared engine primitives — use them.

## Files you own (do not edit anything outside this list)
- `apps/web/modules/adjustments/components/list/table/adjustments-list-columns.ts` — the single source of truth for adjustment column order (`ADJUSTMENTS_LIST_COLUMNS`).
- `apps/web/modules/inventory/components/record/create/inventory-create-fields.tsx` — the split/create form grid where the four cells need explicit rows.

## Layer-by-layer map
- **Module dir (Task 1)** — `apps/web/modules/adjustments/components/list/table/adjustments-list-columns.ts` (9-27): currently `quantity`(11) → `cost`(12) → `freight`(13) → `adjustment`(14) → … → `workOrderNumber`(21). Reorder so `cost` and `freight` sit immediately **before** `workOrderNumber`. This one array feeds **both** the dashboard adjustments list (`modules/adjustments/components/list/adjustments-table.tsx` 5,24, re-exported via `modules/adjustments/index.ts` 10) and the inventory record adjustments section (`modules/inventory/components/record/adjustments/inventory-adjustments-list.tsx` 14-17,101) — one edit fixes both; do **not** edit those consumer files.
- **Module dir (Task 2)** — `apps/web/modules/inventory/components/record/create/inventory-create-fields.tsx` (105-130): `RollNumberField`, `DyeLotField`, `NoteField`, `InternalNotesField` are placed `<CellAt col={1} colSpan={4}>` with **no `row`**, so they auto-flow into gap rows left by the `col={5}` Cost/Freight cells (90-103). Add explicit `row={…}` to anchor each to the correct row — mirror the gap-free pattern in `modules/inventory/components/record/primary/inventory-primary-fields-section.tsx` (74-89), which uses explicit `<CellAt col={1} row={N}>`. `CellAt` semantics: `apps/web/engines/record-view/layout-grid/cell-at.tsx` (26-37) — omitting `row` triggers CSS-grid auto-flow; the grid is the 8-col `InventoryFieldGrid` (`modules/inventory/components/record/fields/inventory-field-grid.tsx` 17). **Do not edit `cell-at.tsx` or `inventory-field-grid.tsx`** — just pass explicit rows from the create-fields component.

## Migration
None — this is UI-only. No schema change.

## Done means
- `/check` green (build + typecheck + lint + test).
- Adjustments tables show Cost, Freight left of WO# (verify both the dashboard list and the inventory record section, since they share the array).
- Split form shows Roll #, Dye Lot, Note, Internal Notes with no gap above them.
- Commit message ≤17 words ready. **DO NOT COMMIT — the user commits.**
