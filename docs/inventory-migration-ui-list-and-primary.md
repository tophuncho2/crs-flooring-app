# Inventory UI primitive migration — list view + primary section

Mirrors the imports migration documented in [docs/session-3/](session-3/). Strict UI swap: list view + primary fields section of the record view. Mutations, cut logs section, and shared engines untouched.

## Scope

| Area | Status |
|---|---|
| Inventory list view ([apps/web/modules/inventory/components/list/](../apps/web/modules/inventory/components/list/)) | ✅ migrated |
| Primary fields section ([sections/inventory-primary-fields-section.tsx](../apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx)) | ✅ migrated |
| Cut logs section ([sections/inventory-cut-logs-section.tsx](../apps/web/modules/inventory/components/record/sections/inventory-cut-logs-section.tsx)) | ⛔ out of scope |
| Mutations / controllers / data | ⛔ out of scope (next sweep) |
| `apps/web/modules/shared/engines/*` | 🔒 untouched |

## Files touched

- [apps/web/modules/inventory/components/list/inventory-client.tsx](../apps/web/modules/inventory/components/list/inventory-client.tsx) — full rewrite
- [apps/web/modules/inventory/components/list/inventory-table.tsx](../apps/web/modules/inventory/components/list/inventory-table.tsx) — full rewrite
- [apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx](../apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx) — full rewrite

## Files deliberately not touched

- [inventory-detail-client.tsx](../apps/web/modules/inventory/components/record/inventory-detail-client.tsx) — uses `RecordDetailClientScaffold` (engine wrapper stays)
- [inventory-record-panel.tsx](../apps/web/modules/inventory/components/record/inventory-record-panel.tsx) — uses `RecordMultiSectionPanel` + `RecordPrimarySectionInstance` (both stay; the inner JSX returned by the primary section's `render` is the only thing that changed, and the section-component prop signature is unchanged so the panel file itself doesn't need edits)
- [inventory-cut-logs-section.tsx](../apps/web/modules/inventory/components/record/sections/inventory-cut-logs-section.tsx)
- All controllers, all data files, all engines

## Old → new import map

### List view

| Old import | New import |
|---|---|
| `DashboardCardTitle` (engines/common/display) | absorbed into `SectionHeader` `title` prop |
| `FormStatusNotices` (engines/common/feedback) | inline emerald / rose notice `<div>`s (Tailwind) |
| `DashboardListPageScaffold` (engines/list-view/scaffold) | hand-rolled wrapper `<div>` + `SectionHeader` from `@/components/headers` |
| `DashboardListPageControls` (engines/list-view/controls) | `SearchControl` (`@/components/features/search`) + `SortToggle` (`@/components/features/sort`) + inline count `<span>` |
| `TablePaginationControls` (engines/list-view/table) | `PaginateControls` (`@/components/features/paginate`) — rendered via `Grid` `footerSlot` |
| `DashboardListPageTable` + `DashboardListRowCell` + `renderDashboardRowCells` + `ClickableTableRow` + `TableEmptyRow` (engines/list-view/table) | `Grid<InventoryRow>` + `GridEmpty` from `@/components/grid` |
| `renderGroupedTableRows` (engines/list-view/table) | dropped — grouping deferred (mirrors imports) |
| `GroupedRowTree` type | dropped — no longer needed in inventory module |
| `useConfiguredTableState` (engines/list-view/controllers) | **stays** — drives search / sort / pagination / `visibleColumns` |

### Primary section

| Old import | New import |
|---|---|
| `RecordPrimarySection` | `FieldSection` (`@/components/fields`) |
| `RecordPrimaryPane` × 2 | dropped — single unified 8-col grid (mirrors imports) |
| `RecordPrimaryFieldsGrid` | absorbed into `FieldSection` |
| `RecordPrimaryFieldCell` | `CellAt` (`@/components/layout-grid`) — explicit `col` / `colSpan` |
| `RecordFormField` | `FormField` (`@/components/fields`) |
| `RecordStaticFieldValue` | `StaticFieldValue` (`@/components/fields`) for derived values; `TextCell editable={false}` for read-only inputs (Product, Import #) |
| Editable `<input>` + `RECORD_FIELD_CONTROL_CLASS_NAME` | `TextCell` (`@/components/cells`) |
| Read-only `<input readOnly>` + `READONLY_FIELD_CLASS_NAME` | `TextCell editable={false}` |
| Editable `<select>` + `RECORD_FIELD_CONTROL_CLASS_NAME` | `SelectCell` (`@/components/cells`) |
| Editable `<textarea>` + `RECORD_TEXTAREA_CONTROL_CLASS_NAME` | `TextareaCell` (`@/components/cells`) `rows={2}` |
| `RECORD_CURRENCY_PREFIX` | inline `` `$${value}` `` template literal — display lives in `StaticFieldValue` |

## Phase 1 — list view

### `inventory-client.tsx`

- Dropped engine imports for scaffold / controls / pagination / notices / card title / `GroupedRowTree`.
- Added: `SectionHeader`, `SearchControl`, `SortToggle`.
- Kept: `useConfiguredTableState` and the full 17-field config (preserves table preferences, search, sort, visible-column behavior).
- Page chrome rebuilt: `<div className="min-h-screen ...">` → `<div className="rounded-xl border ...">` containing `SectionHeader` (title "Inventory", no actions — inventory has no list-page create), inline notice rows, filter bar (`SearchControl` + `SortToggle` + count), then `<InventoryTable>`.
- `groupedRowTree` and `isGroupingEnabled` are no longer pulled from the controller hook (controller still computes them; we just stopped consuming them).
- The standalone bottom pagination slot is gone — pagination is inside `Grid`'s `footerSlot` now.

### `inventory-table.tsx`

- Dropped every engine table import (`DashboardListPageTable`, `DashboardListRowCell`, `renderDashboardRowCells`, `ClickableTableRow`, `TableEmptyRow`, `TablePaginationControls`, `renderGroupedTableRows`, `GroupedRowTree`).
- Added: `Grid`, `GridEmpty`, `GridColumn`, `GridLayout` from `@/components/grid`; `PaginateControls` from `@/components/features/paginate`.
- `INVENTORY_LIST_COLUMNS_BY_KEY` defines all 17 columns keyed by `column.key`. `dataColumns` is built dynamically from the incoming `visibleColumns` prop:
  ```ts
  const dataColumns = visibleColumns
    .map((column) => INVENTORY_LIST_COLUMNS_BY_KEY[column.key])
    .filter((column): column is GridColumn<InventoryRow> => Boolean(column))
  ```
  This preserves the user's table-preference visibility configuration — required because inventory has 8 default-hidden columns (vs imports' zero).
- Single `renderCell` switch ports every old formatter inline: `formatInventoryImportNumber`, `formatInventoryQuantity`, `formatStableDate`; `font-medium text-blue-500` for import numbers; `font-semibold tabular-nums` for stockBalance; `tabular-nums` for quantity / cost / freight; `"-"` fallback per column.
- `onRowClick` / `getRowAriaLabel` replace the old `ClickableTableRow` wrapper.
- `empty={<GridEmpty>No live inventory rows yet.</GridEmpty>}`.
- `footerSlot={<PaginateControls … />}` with the existing pagination state (callback path; no SSR href fallback — inventory list is client-paginated).

### Behavior preserved

- Table preferences (visible columns, sort direction, search term).
- Search across product / item # / import / section / location.
- Pagination via `useConfiguredTableState`.
- Row click navigation to `/dashboard/inventory/{id}`.

### Behavior changed (intentional, mirrors imports)

- **Grouping no longer renders.** Controller still computes `groupedRowTree`; the new Grid does not render groups. Consistent with the imports sweep and the planned grouping-as-its-own-tool split.
- **Visual chrome** — list page card / header / filter bar match the imports list now.

## Phase 2 — primary fields section

### `inventory-primary-fields-section.tsx`

- Dropped the entire engine import block (`RECORD_CURRENCY_PREFIX`, `RECORD_FIELD_CONTROL_CLASS_NAME`, `RECORD_TEXTAREA_CONTROL_CLASS_NAME`, `RecordFormField`, `RecordPrimaryFieldCell`, `RecordPrimaryFieldsGrid`, `RecordPrimaryPane`, `RecordPrimarySection`, `RecordStaticFieldValue`, `READONLY_FIELD_CLASS_NAME` derived constant).
- Added:
  ```ts
  import { CellAt } from "@/components/layout-grid"
  import { FieldSection, FormField, StaticFieldValue } from "@/components/fields"
  import { SelectCell, TextCell, TextareaCell } from "@/components/cells"
  ```
- Component prop signature unchanged — [inventory-record-panel.tsx](../apps/web/modules/inventory/components/record/inventory-record-panel.tsx) does not need to change.

### Layout (single 8-col `FieldSection`)

| Row | Cells |
|---|---|
| 1 | Product (col 1, span 4) · Import # (col 5, span 2) · Item # (col 7, span 2) |
| 2 | Warehouse (col 1, span 2) · Location (col 3, span 2) · Full Location (col 5, span 2) · Lot (col 7, span 2) |
| 3 | Starting Balance (col 1, span 2) · Cut Balance (col 3, span 2) · Available (col 5, span 2) · Coverage (col 7, span 2 — only when set) |
| 4 | Cost (col 1, span 2) · Freight (col 3, span 2) |
| 5 | Notes (col 1, span 8) |

### Cell mapping (per field)

| Field | Cell | Notes |
|---|---|---|
| Product | `TextCell editable={false}` | value from `inventory.productName` |
| Import # | `TextCell editable={false}` | `formatInventoryImportNumber(inventory.importNumber)` |
| Item # | `TextCell` | passthrough |
| Warehouse | `SelectCell required` | options `{ value: id, label: name }` |
| Location | `SelectCell` | options `{ value: id, label: shortCode }`; gated on `!!draft.warehouseId`; placeholder "Select warehouse first" when warehouse empty |
| Full Location | `StaticFieldValue` | `selectedLocation?.locationCode \|\| "-"` |
| Lot | `TextCell` | passthrough |
| Starting / Cut / Available | `StaticFieldValue` | `formatInventoryQuantity(...)` |
| Coverage | `StaticFieldValue` | only rendered when `inventory.coverageBalance` truthy |
| Cost / Freight | `StaticFieldValue` | `` `$${value}` `` or `"-"` |
| Notes | `TextareaCell rows={2}` | full-width row |

`editable = !disabled` drives every editable cell.

### Behavior preserved

- Field validation, dirty-state, save/discard, conflict banner — live in `RecordPrimarySectionInstance` + `useInventoryPrimarySection`. Untouched.
- Location options filtered by selected warehouse — `availableLocationOptions` is computed in the controller and passed in; no change.

### Behavior changed (intentional, mirrors imports)

- **Two-pane visual layout collapses to a single 8-col grid.** Same delta the imports sweep made and accepted.

## Verification

### Typecheck

| Stage | Total `apps/web` errors | `modules/inventory/` errors |
|---|---|---|
| Baseline (before this sweep) | 57 | 0 |
| After Phase 1 (list view) | 57 | 0 |
| After Phase 2 (primary section) | 57 | 0 |

Zero new errors.

### Tests

| Stage | Test files | Tests |
|---|---|---|
| Baseline (before this sweep) | 9 failed / 37 passed (46) | 20 failed / 163 passed (183) |
| After this sweep | 9 failed / 37 passed (46) | 20 failed / 163 passed (183) |

Zero regressions. All pre-existing failures are unrelated to inventory:

- `tests/shared/architecture-boundaries.test.ts` (4) — BullMQ / Prisma / web boundaries
- `tests/shared/package-scripts.test.ts` (1) — Prisma ownership
- `tests/engines/record-view/record-view-feature-alignment.test.ts` (5) — references non-existent paths (templates, categories, work-orders) and old `inventory/record/panel/...` paths from the previous folder shape
- `tests/engines/record-view/record-view-single-section-engine.test.tsx` (1)
- `tests/server/auth/route-auth.test.ts` (1)
- `tests/server/http/route-helpers.test.ts` (1)
- `tests/modules/imports/imports-routes.test.ts` (4) — DELETE / GET routes
- `tests/modules/imports/imports-summary.test.ts` (2)
- `tests/modules/products/products-detail-client.test.tsx` (2)

No inventory test files exist (verified — `apps/web/tests/modules/inventory/` does not exist). No new tests were added in this sweep; coverage is a follow-up alongside the upcoming mutations rewire.

### Grep gate

After the sweep:

```
$ grep -n "engines/list-view\|engines/record-view" \
    apps/web/modules/inventory/components/list/inventory-client.tsx \
    apps/web/modules/inventory/components/list/inventory-table.tsx \
    apps/web/modules/inventory/components/record/sections/inventory-primary-fields-section.tsx
apps/web/modules/inventory/components/list/inventory-client.tsx:6:import { useConfiguredTableState } from "@/modules/shared/engines/list-view/controllers/use-configured-table-state"
```

Only the deliberate `useConfiguredTableState` import remains in the migrated files. Other inventory files (record-panel, detail-client, cut-logs-section, controllers) still import from engines — that is expected and out of scope for this sweep.

## Out of scope — picked up next

- **Mutations.** [`useInventoryPrimarySection.saveSection`](../apps/web/modules/inventory/controllers/use-inventory-primary-section.ts) (POST `/api/inventory/{id}/primary/section`) and `.deleteRecord` (DELETE `/api/inventory/{id}`) stay as-is. The next pass rewires these to the correct use cases.
- **Cut logs section.** [inventory-cut-logs-section.tsx](../apps/web/modules/inventory/components/record/sections/inventory-cut-logs-section.tsx) and its controller remain on the engines until the primary section is finalized.
- **Engine deletion.** Per project constraint, nothing under `apps/web/modules/shared/engines/` is removed in this sweep.
- **Folder canonicalization.** [apps/web/modules/CLAUDE.md](../apps/web/modules/CLAUDE.md) specifies `components/record/{section}/` (one folder per section); inventory currently uses `components/record/sections/`. Out of scope here — flag for a later restructure pass.
- **Grouping.** Deferred consistently with imports; tracked as its own tool.
- **Test coverage for the migrated UI.** Inventory has no client tests yet. Adding them is a follow-up alongside the mutations rewire.
