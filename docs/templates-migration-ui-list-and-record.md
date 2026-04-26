# Templates UI primitive migration — list view + record view

Mirrors the imports + inventory migrations ([docs/session-3/](session-3/), [docs/inventory-migration-ui-list-and-primary.md](inventory-migration-ui-list-and-primary.md)). Strict UI swap: list view + both record sections (primary + material items). Mutations, controllers, API routes, and the create flow untouched.

## Scope

| Area | Status |
|---|---|
| Templates list view ([apps/web/modules/templates/components/list/](../apps/web/modules/templates/components/list/)) | ✅ migrated |
| Primary fields section ([template-primary-fields-section.tsx](../apps/web/modules/templates/components/record/template-primary-fields-section.tsx)) | ✅ migrated |
| Material items section ([template-material-items-section.tsx](../apps/web/modules/templates/components/record/template-material-items-section.tsx)) | ✅ migrated |
| Template record panel ([template-record-panel.tsx](../apps/web/modules/templates/components/record/template-record-panel.tsx)) | ✅ small edit (flattened the material-items section's `subHeader` envelope into discrete props) |
| Create flow ([template-create-client.tsx](../apps/web/modules/templates/components/record/template-create-client.tsx)) | ⛔ deferred (mirror imports pattern) |
| Mutations / controllers / data / routes | ⛔ untouched |
| `apps/web/modules/shared/engines/*` | 🔒 untouched |

## Files touched

- [apps/web/modules/templates/components/list/templates-client.tsx](../apps/web/modules/templates/components/list/templates-client.tsx) — full rewrite
- [apps/web/modules/templates/components/list/templates-table.tsx](../apps/web/modules/templates/components/list/templates-table.tsx) — full rewrite
- [apps/web/modules/templates/components/record/template-primary-fields-section.tsx](../apps/web/modules/templates/components/record/template-primary-fields-section.tsx) — full rewrite
- [apps/web/modules/templates/components/record/template-material-items-section.tsx](../apps/web/modules/templates/components/record/template-material-items-section.tsx) — full rewrite + small prop API change (flat props vs `subHeader` envelope)
- [apps/web/modules/templates/components/record/template-record-panel.tsx](../apps/web/modules/templates/components/record/template-record-panel.tsx) — flattened the material-items section's render call to match the new flat props; extracted `error?.message` for ActionHeader's ReactNode `error` slot

## Files deliberately not touched

- [template-detail-client.tsx](../apps/web/modules/templates/components/record/template-detail-client.tsx) — uses `RecordDetailClientScaffold` (engine wrapper stays)
- [template-create-client.tsx](../apps/web/modules/templates/components/record/template-create-client.tsx) — uses `RecordCreateClientScaffold` + `RecordSingleSectionPanel` + `useSingleSectionCreateController` (deferred); continues to consume the migrated `TemplatePrimaryFieldsSection` with its unchanged prop signature
- All controllers, all data files, all engines, all API routes, all dashboard page routes

## Old → new import map

### List view

| Old import | New import |
|---|---|
| `Plus` (lucide-react) | dropped — `+ Template` rendered as plain text inside `SectionHeader` `actions` |
| `FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME` (engines/common/display/accent-styles) | absorbed into `SectionHeader` `actions` (`kind: "primary"`) |
| `DashboardCardTitle` (engines/common/display) | absorbed into `SectionHeader` `title` prop |
| `FormStatusNotices` (engines/common/feedback) | inline emerald / rose notice `<div>`s (Tailwind) |
| `DashboardListPageScaffold` (engines/list-view/scaffold) | hand-rolled `<div className="min-h-screen ...">` + `<div className="rounded-xl border ...">` + `SectionHeader` from `@/components/headers` |
| `DashboardListPageControls` (engines/list-view/controls) | `SearchControl` (`@/components/features/search`) + `SortToggle` (`@/components/features/sort`) + inline count `<span>` |
| `TablePaginationControls` (engines/list-view/table) | `PaginateControls` (`@/components/features/paginate`) — rendered via `Grid` `footerSlot` with `previousPageHref` / `nextPageHref` (server-paginated mode) |
| `DashboardListPageTable` + `DashboardListRowCell` + `renderDashboardRowCells` + `ClickableTableRow` + `TableEmptyRow` (engines/list-view/table) | `Grid<TemplateListRow>` + `GridEmpty` from `@/components/grid` |
| `renderGroupedTableRows` (engines/list-view/table) | dropped — grouping deferred (mirrors imports + inventory) |
| `GroupedRowTree` type | dropped |
| `useConfiguredTableState` (engines/list-view/controllers) | **stays** — drives search / sort / pagination / `visibleColumns` and the `urlSyncMode: "router"` server-paginated wiring |
| `useRecordEntryNavigation` (engines/common/record-entry) | **stays** — drives `+ Template` create button + row-click navigation |

### Primary section

| Old import | New import |
|---|---|
| `RecordPrimarySection` | `FieldSection` (`@/components/fields`) |
| `RecordPrimaryPane` × 2 (left + right) | dropped — single unified 8-col grid (mirrors imports + inventory) |
| `RecordPrimaryFieldsGrid` | absorbed into `FieldSection` |
| `RecordPrimaryFieldCell` (and `size="lg"` etc) | `CellAt` (`@/components/layout-grid`) — explicit `col` / `colSpan` |
| `RecordFormField` | `FormField` (`@/components/fields`) |
| Editable `<select>` + `RECORD_FIELD_CONTROL_CLASS_NAME` | `SelectCell` (`@/components/cells`) |
| Editable `<input>` + `RECORD_FIELD_CONTROL_CLASS_NAME` | `TextCell` (`@/components/cells`) |
| Editable `<textarea>` + `RECORD_FIELD_CONTROL_CLASS_NAME` | `TextareaCell` (`@/components/cells`) `rows={3}` |

### Material items section

| Old import | New import |
|---|---|
| `RecordItemSection` (with `subHeader` / `metrics` / `capabilities` / `bodyClassName` / `isEmpty` / `emptyState`) | `ActionHeader` from `@/components/headers` (drives title + summary + Add Material Item / Discard / Save Material Items actions + notices) inside a hand-rolled `rounded-xl border` panel |
| `RecordSectionGrid` + `RecordSectionGridRow` | `Grid<TemplateMaterialItemLocal>` from `@/components/grid` with explicit `dataColumns` |
| `RecordItemCell` (with `chrome="grid"` / `density="compact"` / `showLabel`) | dropped — cells render uniformly inside `Grid` (sticky header row provides labels) |
| `RecordGridCellInput` (`type="number"` / `type="text"`) | `NumberCell` (quantity) / `CurrencyCell` (unitPrice) / `TextCell` (notes) |
| Native `<select>` for product | `DropdownCell` (`@/components/cells`) — same pattern as imports staged-rows product picker |
| `RecordItemSectionControls` (with `remove` slot) | trailing control column `kind: "actions"` rendered as `RowActionButton` (`@/components/cells`) with `tone="destructive"` |
| `RecordRowColumnSpec` type | `GridLayout<TemplateMaterialItemLocal>` from `@/components/grid` |
| `RecordSectionSubHeaderProps` type | dropped — section subheader role replaced by `ActionHeader` prop API |
| `RECORD_FIELD_CONTROL_CLASS_NAME` | dropped — cells own their styling |

## Phase 1 — list view

### `templates-client.tsx`

- Dropped engine imports for scaffold / controls / pagination / notices / card title / `Plus` icon / accent button class.
- Added: `SectionHeader`, `SearchControl`, `SortToggle`.
- Kept: `useConfiguredTableState` and the full 8-field config exactly — including `urlSyncMode: "router"`, `disableClientFiltering: true`, `disableClientSorting: true`, `disableClientPagination: true`, `initialPreferences`. Server-paginated mode preserved.
- Kept: `useTemplatesListController` (rows + notices) and `useRecordEntryNavigation` (create + row navigation).
- Page chrome rebuilt to match imports + inventory: full-screen wrapper → bordered card → `SectionHeader` with `+ Template` primary action → inline notice rows → filter bar (`SearchControl` + `SortToggle` + count) → `TemplatesTable`.
- Stopped destructuring grouping plumbing (`isGroupingEnabled`, `groupedRowTree`); the controller still computes them, we just stop consuming them. Grouping defers as its own tool (consistent with imports + inventory).

### `templates-table.tsx`

- Dropped every engine table import.
- Added: `Grid`, `GridEmpty`, `GridColumn`, `GridLayout` from `@/components/grid`; `PaginateControls` from `@/components/features/paginate`.
- Defined `TEMPLATES_LIST_COLUMNS_BY_KEY` keyed by column key with all 8 columns (templateNumber, unitType, property, managementCompany, jobType, warehouse, description, items).
- `dataColumns` built dynamically from incoming `visibleColumns` so user-saved column-visibility preferences via `useConfiguredTableState` keep working.
- Single `renderCell` switch ports each existing formatter (`templateNumber` → `font-medium text-blue-500`, `items` → `tabular-nums`, `"-"` fallback for nullable strings).
- `onRowClick` → `onOpen(row)`. `getRowAriaLabel` → `Open template ${row.templateNumber}`.
- `empty={<GridEmpty>No templates found.</GridEmpty>}`.
- `footerSlot={<PaginateControls ... />}` with the existing pagination state, including SSR `previousPageHref` / `nextPageHref` for server-paginated routing (mirrors imports-table.tsx pattern).

### Behavior preserved

- Table preferences (visible columns, sort direction, search term, group keys — even though grouping doesn't render).
- URL-sync routing (`urlSyncMode: "router"`) and full server-paginated mode.
- Search across template # / unit type / property / MC / job type / warehouse / description.
- Row click navigation to `/dashboard/templates/{id}`.
- `+ Template` button → `templateNavigation.openCreate()`.

### Behavior changed (intentional, mirrors imports + inventory)

- **Grouping no longer renders.** Controller + table state still compute `groupedRowTree`; we just don't pass it to the new Grid.
- **Visual chrome** matches imports + inventory list now.

## Phase 2 — primary fields section

### `template-primary-fields-section.tsx`

- Dropped the entire engine import block (`RECORD_FIELD_CONTROL_CLASS_NAME`, `RecordFormField`, `RecordPrimaryFieldCell`, `RecordPrimaryFieldsGrid`, `RecordPrimaryPane`, `RecordPrimarySection`).
- Added:
  ```ts
  import { CellAt } from "@/components/layout-grid"
  import { FieldSection, FormField } from "@/components/fields"
  import { SelectCell, TextCell, TextareaCell } from "@/components/cells"
  ```
- Component prop signature unchanged — both [template-record-panel.tsx](../apps/web/modules/templates/components/record/template-record-panel.tsx) and [template-create-client.tsx](../apps/web/modules/templates/components/record/template-create-client.tsx) keep working without edits.

### Layout (single 8-col `FieldSection`)

| Row | Cells |
|---|---|
| 1 | Management Company (col 1, span 2) · Property (col 3, span 2, required) · Job Type (col 5, span 2) · Unit Type (col 7, span 2) |
| 2 | Warehouse (col 1, span 2) · Description (col 3, span 6) |
| 3 | Instructions (col 1, span 8) — textarea, rows=3 |
| 4 | Property Instructions (col 1, span 8) — textarea, rows=3 |
| 5 | Template Notes (col 1, span 8) — textarea, rows=3 |

### Cell mapping

| Field | Cell | Notes |
|---|---|---|
| Management Company | `SelectCell` | `editable={!disabled && !managementCompanyLocked}`; placeholder "No management company" |
| Property | `SelectCell required` | `editable={!disabled && !propertyLocked}`; placeholder "Select property" |
| Job Type | `SelectCell` | placeholder "No job type" |
| Unit Type | `TextCell` | passthrough |
| Warehouse | `SelectCell` | placeholder "No warehouse" |
| Description | `TextCell` | passthrough |
| Instructions | `TextareaCell rows={3}` | full-width row |
| Property Instructions | `TextareaCell rows={3}` | full-width row |
| Template Notes | `TextareaCell rows={3}` | full-width row |

`editable = !disabled` drives every editable cell; `propertyLocked` and `managementCompanyLocked` further gate the two relevant selects (used by the create flow when navigating from a property page).

### Behavior preserved

- Field validation, dirty-state, save/discard, conflict banner — live in `RecordPrimarySectionInstance` + `useTemplatePrimarySection`. Untouched.
- `propertyLocked` / `managementCompanyLocked` gates Edit access on those two selects.
- Create flow continues to consume the same component with the same props.

### Behavior changed (intentional)

- **Two-pane visual layout collapses to a single 8-col grid.** Same delta the imports + inventory sweeps made and accepted.

## Phase 3 — material items section

### `template-material-items-section.tsx`

- Dropped the entire engine import block (`RECORD_FIELD_CONTROL_CLASS_NAME`, `RecordGridCellInput`, `RecordItemCell`, `RecordItemSection`, `RecordItemSectionControls`, `RecordSectionGrid`, `RecordSectionGridRow`, `RecordRowColumnSpec` type, `RecordSectionSubHeaderProps` type).
- Added:
  ```ts
  import { ActionHeader } from "@/components/headers"
  import { CurrencyCell, DropdownCell, NumberCell, RowActionButton, TextCell } from "@/components/cells"
  import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
  ```
- **Prop API change:** flattened the engine-shaped `subHeader: Omit<RecordSectionSubHeaderProps, ...>` envelope into discrete props (`isDirty`, `isSaving`, `hasConflict`, `error`, `noticeMessage`, `noticeError`, `onSave`, `onDiscard`, `onAddItem`). The `MaterialItemProductOption` export is preserved.
- Section chrome rebuilt around `ActionHeader`:
  - title `"Material Items"`
  - summary `n item(s)` (replaces engine's `metrics: [{ label: "Items", value: n }]`)
  - actions: `+ Add Material Item` (secondary) · `Discard` (secondary, gated on dirty) · `Save Material Items` (primary, gated on dirty + !saving + !hasConflict)
  - `message={noticeMessage}` / `error={error ?? noticeError}`
- Body rebuilt around `Grid<TemplateMaterialItemLocal>`:
  - 4 data columns: product / quantity / unitPrice / notes (matches live exactly — no smoke-only category-filter or line-total additions)
  - 1 trailing control column `kind: "actions"` for the per-row remove `RowActionButton` (`tone="destructive"`)
  - Empty state: `GridEmpty` with "No material items yet."

### Cell mapping

| Column | Cell | Notes |
|---|---|---|
| Product | `DropdownCell` | options `{ id, label }` from `productOptions`; placeholder "Select product" |
| Quantity | `NumberCell` | placeholder "Quantity"; numeric input |
| Unit Price | `CurrencyCell` | placeholder "Unit price"; semantic upgrade from raw `<input type="number">` |
| Notes | `TextCell` | placeholder "Notes" |
| Remove | `RowActionButton tone="destructive"` | `editable={!isSaving}`; calls `onRemoveItem(item.id)`; title flips to "Saving..." when not editable |

`editable = !isSaving` drives every editable cell (matches the live `disabled={subHeader?.isSaving}` gate).

### Parallel edit in `template-record-panel.tsx`

The section's `render` call switched from the engine-shaped `subHeader` envelope to flat props:

```tsx
<TemplateMaterialItemsSection
  items={materialItems.items}
  productOptions={productOptions}
  isDirty={materialItems.isDirty}
  isSaving={materialItems.isSaving}
  hasConflict={materialItems.hasConflict}
  error={materialItems.error?.message ?? null}  // RecordSectionError → string for ActionHeader's ReactNode slot
  noticeMessage={materialItems.noticeMessage}
  noticeError={materialItems.noticeError}
  onSave={() => void materialItems.save()}
  onDiscard={() => materialItems.discard()}
  onAddItem={materialItems.addItem}
  onChangeField={materialItems.changeField}
  onRemoveItem={materialItems.removeItem}
/>
```

### Behavior preserved

- Diff-based save (controller-side; untouched).
- Per-row validation (controller-side; untouched).
- Add Row inserts a local row with a temp client ID (controller-side; untouched).
- Remove Row deletes immediately from local state, included in next save's diff (controller-side; untouched).
- `hasConflict` blocks save until refresh (controller-side; untouched).

### Behavior changed (intentional, mirrors imports staged-rows)

- **Section chrome unifies on `ActionHeader`.** Drops the engine's `subHeader` envelope shape, `metrics`, `capabilities` flags, `bodyClassName`, separate `emptyState`, and `RecordItemSectionControls`.
- **Cells render uniformly.** Drops `chrome="grid"`, `density="compact"`, and `showLabel` (which only labelled the first row's cells). A real sticky header row provides labels.
- **Visual delta accepted.** Same nature of delta as imports + inventory.

## Verification

### Typecheck

| Stage | Total `apps/web` errors | `modules/templates/` errors |
|---|---|---|
| Baseline | 57 | 0 |
| After Phase 1 | 57 | 0 |
| After Phase 2 | 57 | 0 |
| After Phase 3 (final) | 57 | 0 |

Zero new errors at every stage.

### Tests

| Stage | Test files | Tests |
|---|---|---|
| Baseline | 9 failed / 37 passed (46) | 20 failed / 163 passed (183) |
| After this sweep | 9 failed / 37 passed (46) | 20 failed / 163 passed (183) |

Zero regressions. All pre-existing failures unrelated to templates (architecture-boundaries, engine-alignment with stale paths, server, imports routes/summary, products detail).

### Grep gate

```
$ grep -n "engines/list-view\|engines/record-view" \
    apps/web/modules/templates/components/list/templates-client.tsx \
    apps/web/modules/templates/components/list/templates-table.tsx \
    apps/web/modules/templates/components/record/template-primary-fields-section.tsx \
    apps/web/modules/templates/components/record/template-material-items-section.tsx
apps/web/modules/templates/components/list/templates-client.tsx:6:import { useConfiguredTableState } from "@/modules/shared/engines/list-view/controllers/use-configured-table-state"
apps/web/modules/templates/components/list/templates-client.tsx:7:import type { TablePreferencePayload } from "@/modules/shared/engines/list-view/controllers/table-preferences"
```

Only the deliberate `useConfiguredTableState` + its `TablePreferencePayload` type imports remain in the migrated files. Other templates files (template-detail-client, template-record-panel, template-create-client, controllers) still import from engines — that is expected and out of scope for this sweep.

The `useRecordEntryNavigation` import in templates-client.tsx is from `engines/common/record-entry` (not list-view or record-view) and intentionally stays.

## Out of scope — picked up later

- **Create flow.** [template-create-client.tsx](../apps/web/modules/templates/components/record/template-create-client.tsx) and [/dashboard/templates/new/page.tsx](../apps/web/app/dashboard/templates/new/page.tsx) keep engine wrappers (`RecordCreateClientScaffold`, `RecordSingleSectionPanel`, `useSingleSectionCreateController`) until a follow-up sweep across all module create flows. The migrated `TemplatePrimaryFieldsSection` continues to work inside those wrappers because its prop signature is unchanged.
- **Engine deletion.** Per project constraint, nothing under `apps/web/modules/shared/engines/` is removed in this sweep.
- **Folder canonicalization.** [apps/web/modules/CLAUDE.md](../apps/web/modules/CLAUDE.md) specifies `components/record/{section}/` (one folder per section); templates currently uses flat files in `components/record/`. Out of scope here — flag for a later restructure pass.
- **Grouping.** Deferred consistently with imports + inventory; tracked as its own tool.
- **Test coverage for the migrated UI.** Templates has no client tests yet; adding coverage is a follow-up.
