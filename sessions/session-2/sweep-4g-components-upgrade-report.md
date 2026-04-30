# Sweep 4g — Components/ upgrade: child rows, control columns, invisible field grid — Report

## Headlines

- **`grid/` upgraded** from flex layout to CSS Grid. Header + body rows now share a single `grid-template-columns` template, so column edges align across the whole grid even when row contents vary.
- **`GridLayout<TRow>`** is the new canonical layout shape: `dataColumns` + optional `leadingControls` + `trailingControls`. Control columns (selection / expand / actions / open / status-indicator) flow into the grid template at fixed pixel widths.
- **`ScopedRow<TChild>`** primitive ships for child-scoped rows (warehouse sections-locations precedent). Children render with their **own** `GridLayout<TChild>` — the parent's column shape doesn't constrain children. Consumers interleave via `<Fragment>`.
- **`layout-grid/` bucket added** — the "invisible grid" model. Cells place themselves at explicit `(col, row, colSpan, rowSpan)` coordinates. Default chrome is invisible; opt into visible chrome for framed compositions.
- **`fields/` bucket added** — `FieldSection` (pre-configured 8-column invisible `LayoutGrid` with auto-flex rows), `FormField` (label + slot for any cell), `StaticFieldValue` (read-only display).
- **The cell vocabulary stays unchanged.** Same `TextCell` / `CurrencyCell` / `DropdownCell` / etc. — they look and behave identically whether placed in a streaming `Grid` row, a `ScopedRow` child row, or a `LayoutGrid` field cell. Zero per-section variants.
- **5 new discipline rules** appended to `apps/web/components/CLAUDE.md` (rules 10–14) capturing the cell-uniformity, child-layout-independence, field-section-composition, 8-column default, and one-placement-model-per-primitive constraints.
- **Engine + modules untouched.** No consumer wires up to the new primitives this sweep.

## Error counts

| Surface | tsc errors |
|---|---|
| `@builders/domain` / `@builders/db` / `@builders/application` | 0 |
| `@builders/web` — `apps/web/components/**` | **0** |
| `@builders/web` — repo total | 57 (identical to sweep 4e/4f baseline; all pre-existing in `work-orders`, `admin`, `record-view/panel`) |

## File inventory

73 files total under `apps/web/components/` (was 56 after 4f, +17 net new this sweep).

### `grid/` updates (5 updated, 4 new)
- UPDATE `grid/contracts/index.ts` — added `grid-control-column` + `grid-layout` exports.
- UPDATE `grid/grid.tsx` — accepts `layout` prop, switched to CSS Grid template, exposes `renderControl` slot.
- UPDATE `grid/grid-header.tsx` — renders leading controls + data columns + trailing controls in template order.
- UPDATE `grid/grid-row.tsx` — CSS Grid template; per-row tone tinting; `renderControl` for control columns.
- UPDATE `grid/index.ts` — exports `ScopedRow`.
- NEW `grid/contracts/grid-control-column.ts` — `GridControlColumn` shape + `GridControlKind` enum.
- NEW `grid/contracts/grid-layout.ts` — `GridLayout<TRow>` discriminated structure.
- NEW `grid/scoped-row.tsx` — child-row primitive with its own `GridLayout<TChild>`.
- NEW `grid/internals/build-grid-template.ts` — shared CSS Grid template builder used by `Grid`, `GridBodyRow`, and `ScopedRow` (one source of truth for the template string).

### `layout-grid/` (6 new)
- NEW `layout-grid/contracts/layout-grid-geometry.ts` — `LayoutGridGeometry` + `LayoutGridChrome` + `FIELD_SECTION_COLUMNS = 8`.
- NEW `layout-grid/contracts/cell-placement.ts` — `CellPlacement` (col/row/colSpan/rowSpan).
- NEW `layout-grid/contracts/index.ts`
- NEW `layout-grid/layout-grid.tsx` — invisible-by-default positioned-cell grid. `chrome: "visible"` opts into framed surface.
- NEW `layout-grid/cell-at.tsx` — `<CellAt col={1} row={1} colSpan={2}>{children}</CellAt>`.
- NEW `layout-grid/index.ts`

### `fields/` (7 new)
- NEW `fields/contracts/form-field.ts` — `FormFieldProps` (label / hint / error / required).
- NEW `fields/contracts/field-section.ts` — re-exports `FIELD_SECTION_COLUMNS` for ergonomic imports.
- NEW `fields/contracts/index.ts`
- NEW `fields/field-section.tsx` — pre-configured 8-column invisible `LayoutGrid`.
- NEW `fields/form-field.tsx` — labelled-control wrapper. Wraps any cell with label + hint + error.
- NEW `fields/static-field-value.tsx` — read-only field display for non-cell values.
- NEW `fields/index.ts`

### Top-level
- UPDATE `apps/web/components/CLAUDE.md` — added the "three-grid model" table, 5 new discipline rules (10–14), updated bucket purposes, added the child-scoped-row + field-section pattern examples.

## Variance vs plan

The plan listed 14 new files + 4 updates. Final count: **17 new files + 5 updates** (CLAUDE.md update counted separately).

The +3 over plan:
1. **`grid/internals/build-grid-template.ts`** — extracted as a shared helper once it became clear the same template-string-building logic was needed in three places (`Grid`, `GridBodyRow`, `ScopedRow`). One source of truth instead of three copies.
2. The grid index update was in the plan but I miscounted it as part of the existing barrel rather than as an "updated" file — it was always going to need an edit.
3. CLAUDE.md update was always going to land; the original count was off by one.

No design changes from the approved plan. All approved API shapes shipped as specified.

## Discipline rules added (10–14)

10. **Cells in `cells/` look identical regardless of section context.** Section-specific styling lives in the section primitive, never in the cell.
11. **Child-scoped rows have their own `GridLayout<TChild>`.** Render via `ScopedRow` interleaved into the parent `Grid` via `<Fragment>`.
12. **Field/main sections compose `FieldSection` (or `LayoutGrid` directly) + `CellAt` + `FormField` + cell components.** No bespoke field-section primitives.
13. **`FieldSection` defaults to 8 columns / auto-flex rows.** Drop down to `LayoutGrid` directly for other column counts.
14. **`Grid` and `LayoutGrid` share the cell vocabulary but not the placement vocabulary.** Adding a third placement model would add a third primitive — never overload an existing one.

## Verification

- `npm run typecheck --workspace @builders/web` → 57 errors total, identical to sweep 4e/4f baseline. Zero are in `apps/web/components/**`.
- `find apps/web/components -type f | wc -l` → 73 (was 56 in 4f, +17 net new this sweep).
- No engine touch: `git diff apps/web/modules/shared/engines/` returns empty.
- No module touch: `git diff apps/web/modules/{imports,inventory,products,manufacturers,warehouse,work-orders,management-companies,properties,services,templates,categories,contacts,unit-of-measures,admin,auth,app-shell}/` returns empty.
- Bucket dependency check: `fields/` imports `layout-grid/` + `cells/`; `cells/` imports `dropdowns/` + `badges/`; `layout-grid/` imports nothing from `cells/` or `fields/`; `grid/` imports nothing from `features/`. Discipline rule 1 respected.

## What did not happen (per plan)

- **No migration.** No consumer wires up to the new primitives. Imports + warehouse + everything else keep importing from the engine.
- **No deletes.** Engine stays.
- **No controllers.** `apps/web/controllers/` still has only the placeholder CLAUDE.md.
- **No new behavior beyond the plan.** Search hardening, scroll virtualization, declarative `getChildren` on the data grid — all reserved for later sweeps.

## Out of scope after this sweep (sequenced for next sweeps)

1. **Migrate the imports staged-inventory section** to `Grid` (new layout shape) + control columns (selection + actions) + the new cell vocabulary. First real consumer for the upgraded `grid/`.
2. **Migrate the imports primary section** to `FieldSection` + `CellAt` + `FormField` + cells. First real consumer for `layout-grid/` + `fields/`. Will exercise the "invisible grid" model end to end.
3. **Migrate the imports list view** to `Grid`. Confirms one `Grid` primitive serves both list + record-view contexts.
4. **Migrate warehouse sections-locations** — first scoped-row consumer in production. Validates `ScopedRow` + interleave pattern.
5. **Mark-for-import workflow controller** in `apps/web/controllers/`. Consumes the new `selection` control column + `ActionHeader`. Adds `GET /api/imports/[id]/staged-inventory-rows` route.
6. **Declarative `getChildren` on `Grid`** — sugar over `ScopedRow` once the manual pattern has settled.
7. **Inventory + products + manufacturers + work-orders + management** module migrations — one per sweep.
8. **Retire engine** once no consumer imports it.
9. **Search hardening + scroll virtualization + chart cells in LayoutGrid** — independent enhancements after the migration arc.
