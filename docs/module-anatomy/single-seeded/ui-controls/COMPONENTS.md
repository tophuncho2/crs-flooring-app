# Single-Seeded — List Components

> The list client + table contract. Evidence: `apps/web/modules/{categories,unit-of-measures}/components/list/`.

## Where

`apps/web/modules/{name}/components/list/`:

- `{name}-client.tsx` — composes the list engine and the scaffold.
- `{name}-table.tsx` — renders rows into the shared `DashboardListPageTable`.

No `record/` folder. No `{name}-filters.tsx`.

## `{name}-client.tsx`

`"use client"`. Default export takes `initial{Name}s`, `initialTablePreferences`, `tableState` props from the Server Component page.

- Declares a module-local `{NAME}_FIELDS` array. Every field sets `groupable: false` — the single-seeded no-grouping rule expressed at the field level.
- Calls `useListViewEngine({ rows, tableKey: "{name}-main", fields, sortField, sortFieldKey, initialSearchQuery, defaultAscending, initialPreferences })`.
- Renders `DashboardListPageScaffold` with the following slots:
  - `title` — `<DashboardCardTitle>{Label}</DashboardCardTitle>`.
  - `controls` — `<DashboardListPageControls engine={engine} searchPlaceholder="…" />`. No `formSlot`, no add button.
  - `table` — the module's `{Name}Table`, fed `engine.processedRows` and `engine.visibleColumns` remapped to `{ key, label }` from the field config.
  - `pagination` — `<TablePaginationControls … />` wired to engine pagination state.
  - `notices` (UoM only) — `<FormStatusNotices … />` driven by the controller's `notices`.

Table key convention: `"{name}-main"` (e.g. `"categories-main"`, `"unit-of-measures-main"`).

## `{name}-table.tsx`

`"use client"`. Plain `<tr>` rendering — no `ClickableTableRow`, no `onOpen`, no row click. Single-seeded rows do not navigate.

- Props: `rows` (already processed, sorted, paginated) and `visibleColumns` (`{ key, label }` pairs) from the client.
- Per-column renderer map: `(columnIndex) => <DashboardListRowCell key="…" columnIndex={columnIndex}>{value}</DashboardListRowCell>`, delegated through `renderDashboardRowCells`.
- Empty state: `<TableEmptyRow message="…" colSpan={visibleColumns.length} />`.
- Wrapper: `<DashboardListPageTable minWidthClass="…" columns={visibleColumns}>`. Min width is module-specific (categories: `min-w-[1280px]`, UoM: `min-w-[780px]`).
- Per-cell display choices vary by module — categories falls back to `"-"` when a joined unit is null; UoM formats `createdAt` via `formatStableDateTime` from `@builders/domain`.

## Imports (canonical set)

**Client:**
- `DashboardCardTitle` from `@/modules/shared/engines/common/display/dashboard-card-title`
- `DashboardListPageScaffold` from `@/modules/shared/engines/list-view/scaffold/dashboard-list-page-scaffold`
- `DashboardListPageControls` from `@/modules/shared/engines/list-view/controls/dashboard-list-page-controls`
- `TablePaginationControls` from `@/modules/shared/engines/list-view/table/table-shell`
- `useListViewEngine` from `@/modules/shared/engines/list-view/controllers/use-list-view-engine`
- `TablePreferencePayload` type from `@/modules/shared/engines/list-view/controllers/table-preferences`
- `{Name}Row` from `../../types`
- `use{Name}ListController` from `../../controllers/use-{name}-list-controller`
- `{Name}Table` from `./{name}-table`
- Optional: `FormStatusNotices` from `@/modules/shared/engines/common/feedback/notices` (UoM pattern)

**Table:**
- `DashboardListPageTable`, `DashboardListRowCell`, `renderDashboardRowCells`, `TableEmptyRow` from `@/modules/shared/engines/list-view/table/*`
- `{Name}Row` from `../../types`
- Optional: formatter helpers from `@builders/domain` (e.g. `formatStableDateTime`)

## What list components do NOT have

1. No `record/` sibling folder — single-seeded has no detail or create view.
2. No add button or `formSlot` on the scaffold.
3. No `ClickableTableRow`, no row click, no `onOpen`.
4. No `{name}-filters.tsx`. The engine's built-in search + sort + pagination is the full control surface.
5. No groupable fields — `groupable: false` on every entry. Page-level `tableState` may pass `defaultGrouped: false` / `allowedGroupKeys: []` belt-and-suspenders, but neither reference currently does (field-level flag is sufficient).
