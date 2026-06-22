# products-hide-send-unit — hide the Send Unit field from the products + category UI (UI only)

## STOP — plan before you touch anything
You are on a fresh dev-N branch. Read the files below, confirm the plan, THEN edit. The code is the source of truth.

## Mission
**Hide** the "Send Unit" field from three UI surfaces — do **not** touch the data layer. Send-unit data must keep flowing (pickers and material grids still consume it):
1. Products **list view** column.
2. Products **record view** cell.
3. Category **list view** column.

## Scope
**In:** the list column entry + its cell renderer for products and for categories; the record-view Send Unit cell for products.
**Out:** no schema, domain, data, or API changes. Leave `ProductRow`/`ProductListRow`/category types and all `*Select` queries intact — they stay so pickers (`product-picker.tsx`, `product-category-picker.tsx`) and material-item grids keep working. Removal is purely the UI entries below and is self-contained.

## Files you own (do not edit anything outside this list)
- `apps/web/modules/products/components/list/table/products-list-columns.ts` — remove the Send Unit column entry.
- `apps/web/modules/products/components/list/table/products-row-cell.tsx` — remove the `sendUnit` render case.
- `apps/web/modules/products/components/record/primary/product-primary-fields-section.tsx` — remove the Send Unit cell + its display var.
- `apps/web/modules/categories/components/list/categories-table.tsx` — remove the Send Unit column entry + its render case.

## Layer-by-layer map (all Module dir — UI only)
- **Products list — column** — `products-list-columns.ts` line 13: remove `{ key: "sendUnit", label: "Send Unit" },` from `PRODUCTS_LIST_COLUMNS`.
- **Products list — cell** — `products-row-cell.tsx` lines 30-31: remove `case "sendUnit": return formatUnit(row.sendUnitName, row.sendUnitAbbrev)`.
- **Products record — cell** — `product-primary-fields-section.tsx`: remove the `<CellAt col={5} row={4} colSpan={2}>` Send Unit block (168-172) and the `sendUnitDisplay` var (78-80). Check whether removing this cell leaves a grid gap (the others in this section use explicit `row=`); if it does, leave the remaining rows as-is unless a gap appears, then keep them visually consistent.
- **Category list — column + cell** — `categories-table.tsx`: remove `{ key: "sendUnit", label: "Send Unit" },` (line 8) from `CATEGORIES_LIST_COLUMNS` and the `case "sendUnit": return row.sendUnit || "-"` (lines 26-27) from `renderCell`.

## Migration
None — UI-only.

## Done means
- `/check` green (build + typecheck + lint + test).
- Send Unit no longer shows in the products list, the products record view, or the category list; product/category pickers and material grids still render units correctly.
- Commit message ≤17 words ready. **DO NOT COMMIT — the user commits.**
