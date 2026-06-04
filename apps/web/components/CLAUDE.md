# `apps/web/components/` — UI Primitives

Pure UI primitives. Modules and routes consume these; nothing in here knows about modules, routes, or domain shape.

## The three-grid model

`apps/web/components/` carries two grid primitives plus one composition layer:

| Primitive | Placement model | Chrome default | Use case |
|---|---|---|---|
| `Grid<TRow>` (in `grid/`) | Streaming rows by array order | Visible borders, header, scroll | List view tables, record-view sub-grids (staged inventory rows, materials, adjustments) |
| `LayoutGrid` (in `layout-grid/`) | Positioned cells via `(col, row)` coordinates | Invisible by default; opt into visible chrome | Field/main sections, dashboard layouts, future chart-spanning compositions |
| `FormField` + `StaticFieldValue` + `FieldSection` (in `fields/`) | Wrappers, no placement of their own | N/A | Labelled controls + read-only displays + section shell, dropped into `LayoutGrid` cells |

**The link:** all three use the same cell vocabulary from `cells/`. A `<TextCell editable={true} …>` placed inside a streaming `Grid` row, a `ScopedRow` child row, or a `LayoutGrid` field cell renders identically.

## Discipline rules

1. **Every primitive lives under exactly one bucket.** Buckets: `grid/`, `layout-grid/`, `fields/`, `cells/`, `dropdowns/`, `dialogs/`, `nav/`, `badges/`, `headers/`, `features/`. Composites import down the dependency tree, never sideways: `cells/` may import `dropdowns/` and `badges/`; `fields/` may import `layout-grid/` and `cells/`; `dropdowns/` never imports `cells/`; `dialogs/` imports nothing from other buckets; `nav/` imports nothing from other buckets; `grid/` never imports any feature.

2. **`contracts/` subfolders contain only types, type aliases, enums, and helper functions over those types.** No JSX. No React imports.

3. **No primitive imports from `apps/web/modules/`, `@/server/`, `@builders/db`, `@builders/application`, or any module-specific code.** Components are pure UI. Domain types from `@builders/domain` are allowed only when a format adapter genuinely needs them.

4. **Every primitive accepts `editable: boolean` (or its absence implies `false`).** Edit modality is part of the contract, not a separate component variant. A `text-cell` with `editable: false` renders a styled `<span>`; with `editable: true` it renders an `<input>`.

5. **No baked-in chrome.** A primitive renders only itself plus its directly-required structure. Containers (panels, scroll wrappers, action headers) are separate primitives consumers compose.

6. **Feature layers under `features/` are opt-in side-cars.** They never know about each other. The `search-control` doesn't care if `sort-toggle` is also rendered. The grid doesn't import any feature.

7. **Naming: drop the `Record` prefix.** New primitives are `Grid`, `TextCell`, `SelectDropdown`, `StatusBadge`, `SearchControl`. The engine versions under `apps/web/modules/shared/engines/` keep `Record*`; no name collisions during the parallel-run period.

8. **Named exports only.** No default exports. Barrels re-export named symbols only.

9. **No "smart" defaults inherited from the engine.** Per-kind defaults (e.g. status → center alignment) are documented in `grid-cell-kind.ts` but not auto-applied. Primitives stay pure.

10. **The cells in `cells/` look identical regardless of section context.** A `TextCell` placed in a `Grid` row, a `ScopedRow` child row, or a `LayoutGrid` field cell renders the same input/static treatment. Section-specific styling lives in the section primitive (`Grid` borders, `ScopedRow` tint, `LayoutGrid` chrome) — never in the cell.

11. **Child-scoped rows have their own `GridLayout<TChild>`, not the parent grid's columns.** Render via `ScopedRow` interleaved into the parent `Grid` via `<Fragment>`. The grid contract does not require children to share the parent's column shape.

12. **Field/main sections compose `FieldSection` (or `LayoutGrid` directly) + `CellAt` + `FormField` + cell components.** No bespoke field-section primitives. The "invisible grid" model is the canonical placement model for any field-style layout (primary section, settings panes, dashboard tiles).

13. **`FieldSection` defaults to 8 columns / auto-flex rows.** Cells span 1–8 columns via `colSpan` on `CellAt`; rows grow to fit. Consumers needing a different column count drop down to `LayoutGrid` directly.

14. **`Grid` and `LayoutGrid` share the cell vocabulary but not the placement vocabulary.** `Grid` streams rows by array order; `LayoutGrid` places cells by `(col, row)`. Adding a third placement model would add a third primitive — never overload an existing one.

## Bucket purpose

- **`grid/`** — streaming-row data grid. CSS Grid layout; data columns + optional fixed-width control columns (selection, expand, actions, status, open). Subsumes list-view tables and record-view sub-grids.
- **`layout-grid/`** — positioned-cell grid. Cells declare `(col, row, colSpan, rowSpan)`. Invisible chrome by default. The "invisible grid" the field/main sections build on; future bar-chart spans plug into the same primitive.
- **`fields/`** — form-field composition layer. `FormField` (label + slot for any cell), `StaticFieldValue` (read-only display), `FieldSection` (pre-configured 8-column invisible `LayoutGrid` with auto-flex rows).
- **`cells/`** — cell renderers (text, number, currency, unit, per-unit, select, dropdown, status, checkbox). One file per kind. Every cell honors the editability contract; identical rendering across grid and field contexts.
- **`dropdowns/`** — standalone dropdown primitives (`SelectDropdown`, `SearchDropdown`). Used by `cells/dropdown-cell.tsx` and by consumers that need a dropdown outside a grid cell.
- **`dialogs/`** — modal overlay primitives (`ConfirmDialog`). Backdrop + centered card; consumers control `open` and supply `onConfirm` / `onCancel`. Use for destructive-action confirmations (void, delete) and any other "are you sure?" prompt that must interrupt the flow.
- **`nav/`** — navigation overlay primitives (`SidePanel`). Backdrop + edge-anchored slide-in card; consumers control `open` and supply `onClose`. Use for nav drawers, feature side panels (template sync, filters), or any side-anchored overlay. Pure chrome — nav-item lists, drawer compositions, and feature wiring live in their consuming module, not here.
- **`badges/`** — status pills + tone-coded indicators.
- **`headers/`** — section headers, action headers (title + status surface + actions panel).
- **`features/{search,sort,group,paginate}/`** — opt-in feature layers. Each ships a contract + a JSX control that consumers slot wherever they want.

## Child-scoped row pattern (warehouse precedent)

Parent rows and child rows can have completely different column shapes. Consumers render parent rows via `Grid` and interleave `ScopedRow` blocks via `<Fragment>`:

```tsx
<Grid layout={parentLayout} rows={parents} renderRow={(parent) => (
  <Fragment>
    <GridBodyRow row={parent} layout={parentLayout} ... />
    {parent.expanded && childGroups[parent.id]?.map((child) => (
      <ScopedRow key={child.id} row={child} layout={childLayout} />
    ))}
  </Fragment>
)} />
```

Full consumer control over expand/collapse, between-row chrome, per-group footers. The grid contract does not require children to share the parent's column shape.

## Field-section pattern (invisible grid)

Field/main sections are an 8-column invisible `LayoutGrid`. Cells place themselves at explicit `(col, row)` coordinates; rows auto-flex to fit:

```tsx
<FieldSection>
  <CellAt col={1} colSpan={2}>
    <FormField label="Order Number">
      <TextCell editable={true} value={form.orderNumber} onChange={...} />
    </FormField>
  </CellAt>
  <CellAt col={3} colSpan={2}>
    <FormField label="Tag">
      <TextCell editable={true} value={form.tag} onChange={...} />
    </FormField>
  </CellAt>
  <CellAt col={5} colSpan={4}>
    <FormField label="Manufacturer">
      <DropdownCell editable={true} value={form.manufacturerId} options={manufacturerOptions} onChange={...} />
    </FormField>
  </CellAt>
  <CellAt col={1} colSpan={8}>
    <FormField label="Notes">
      <TextCell editable={true} value={form.notes} onChange={...} />
    </FormField>
  </CellAt>
</FieldSection>
```

Auto-flow: row 1 holds Order Number (1-2) + Tag (3-4) + Manufacturer (5-8); row 2 holds Notes (1-8). The section "flexes to fit" — no row count declared. Future: `<CellAt col={1} row={3} colSpan={3} rowSpan={2}><BarChart … /></CellAt>` plugs in via the same primitive, no new shape.

## Migration status

This tree is **scaffolding**. Consumers (modules, sections, dashboard pages) currently still import from `apps/web/engines/record-view/` (record-view has been moved into its contained engine) and `apps/web/modules/shared/engines/list-view/` (list-view not yet moved). Migration happens module-by-module in subsequent sweeps; the engine stays in place until nothing imports it.
