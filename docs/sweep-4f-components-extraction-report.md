# Sweep 4f — Extract pure UI primitives into `apps/web/components/` — Report

## Headlines

- **`apps/web/components/` scaffolded** with 56 files across 6 buckets (`grid/`, `cells/`, `dropdowns/`, `badges/`, `headers/`, `features/`). Each bucket has its own `contracts/` subfolder for types-only files.
- **`apps/web/controllers/` reserved** with a single CLAUDE.md placeholder. No controllers shipped this sweep.
- **Universal `Grid<TRow>` shell** with opt-in feature contracts. Subsumes the role of both `RecordSectionGrid` and `DashboardListPageTable`; consumers compose feature controls (search/sort/group/paginate) through `headerSlot` / `footerSlot`. Grid imports zero feature modules.
- **First-class cell-kind enum** (`text | number | quantity | currency | per-unit | select | dropdown | status | checkbox | actions`) with default-alignment map. Lifted out of the engine's buried union into its own contract file.
- **Single `EditabilityContract`** every cell honors. `editable: true` (with `onChange`) vs. `editable: false` (with optional `reason: snapshot | locked | computed | archived`). No "static cell vs. editable cell" duplication.
- **9 cell types implemented** (text, number, currency, unit, per-unit, select, dropdown, status, checkbox), each with distinct editable + static rendering paths from one component.
- **Standalone dropdowns** (`SelectDropdown` with full keyboard nav, `SearchDropdown` with substring filter) usable outside grid cells.
- **Badges + headers + 4 feature controls** (search input, sort toggle, group tree, paginate controls) all stand-alone, no cross-feature coupling.
- **9 discipline rules** captured in `apps/web/components/CLAUDE.md` so future contributors see them on first touch.
- **Zero consumers wired.** Engine, modules, dashboard pages all unchanged. The staged-inventory section keeps importing from the engine.

## Error counts

| Surface | tsc errors |
|---|---|
| `@builders/domain` | 0 |
| `@builders/db` | 0 |
| `@builders/application` | 0 |
| `@builders/web` — `apps/web/components/**` | **0** |
| `@builders/web` — total | 57 (all pre-existing in `work-orders`, `admin`, `record-view/panel`; **identical to sweep 4e baseline**) |

## File inventory (delivered)

### Top-level (2)
- `apps/web/components/CLAUDE.md` — discipline rules + bucket purposes + migration status.
- `apps/web/controllers/CLAUDE.md` — reserved-slot placeholder.

### `grid/` (12)
- `grid/contracts/grid-cell-kind.ts` — `GridCellKind` enum + `GRID_CELL_KIND_ALIGN_DEFAULT` map.
- `grid/contracts/grid-row.ts` — `GridRow` (id + tone + status) + `GridRowTone`.
- `grid/contracts/grid-editability.ts` — `EditabilityContract` discriminated union + `EditabilityReason`.
- `grid/contracts/grid-scroll.ts` — `ScrollContract` + `resolveScrollContract` + defaults.
- `grid/contracts/grid-features.ts` — `GridFeatures` opt-in flag bag.
- `grid/contracts/grid-column.ts` — `GridColumn<TRow>` with `render` / `sortValue` / `groupValue` hooks.
- `grid/contracts/index.ts`
- `grid/grid.tsx` — universal shell with `headerSlot` / `footerSlot`.
- `grid/grid-header.tsx` — no-wrap headers, sticky-optional, flex-aligned.
- `grid/grid-row.tsx` — tone-aware, default cell renderer, `renderCell` override.
- `grid/grid-empty.tsx` — empty-state slot.
- `grid/index.ts`

### `cells/` (14)
- `cells/contracts/cell-tone.ts` — `CellTone` vocabulary + `CELL_TONE_VALUES`.
- `cells/contracts/cell-base.ts` — `CellProps<TValue>` extending `EditabilityContract`.
- `cells/contracts/cell-format.ts` — pure `formatCurrency` / `formatPerUnit` / `formatQuantity` / `formatPercent` / `parseDecimal`.
- `cells/contracts/index.ts`
- `cells/text-cell.tsx`, `cells/number-cell.tsx`, `cells/currency-cell.tsx`, `cells/unit-cell.tsx`, `cells/per-unit-cell.tsx`, `cells/select-cell.tsx`, `cells/dropdown-cell.tsx`, `cells/status-cell.tsx`, `cells/checkbox-cell.tsx`.
- `cells/index.ts`

### `dropdowns/` (6)
- `dropdowns/contracts/dropdown-option.ts` — `DropdownOption` shape with optional `hint` + `disabled`.
- `dropdowns/contracts/dropdown-features.ts` — `searchable` / `allowClear` / `multi` flag bag.
- `dropdowns/contracts/index.ts`
- `dropdowns/select-dropdown.tsx` — keyboard-nav popover, click-outside dismiss, ported from the engine version.
- `dropdowns/search-dropdown.tsx` — substring filter wrapper around `SelectDropdown`.
- `dropdowns/index.ts`

### `badges/` (5)
- `badges/contracts/badge-tone.ts` — re-exports `CellTone` as `BadgeTone`.
- `badges/contracts/index.ts`
- `badges/status-badge.tsx` — pill, 6-tone palette.
- `badges/tone-pill.tsx` — smaller inline variant.
- `badges/index.ts`

### `headers/` (6)
- `headers/contracts/header-action.ts` — `HeaderAction` with `kind: primary | secondary | destructive`.
- `headers/contracts/header-status.ts` — `HeaderStatus` (tone + label + detail).
- `headers/contracts/index.ts`
- `headers/section-header.tsx` — title + subtitle + actions.
- `headers/action-header.tsx` — title + status + summary + actions + error slot.
- `headers/index.ts`

### `features/` (12)
- `features/search/contracts/search-contract.ts`, `features/search/search-control.tsx`, `features/search/index.ts`
- `features/sort/contracts/sort-contract.ts`, `features/sort/sort-toggle.tsx`, `features/sort/index.ts`
- `features/group/contracts/group-contract.ts`, `features/group/group-tree.tsx`, `features/group/index.ts`
- `features/paginate/contracts/paginate-contract.ts`, `features/paginate/paginate-controls.tsx`, `features/paginate/index.ts`

## Discipline rules captured (from `apps/web/components/CLAUDE.md`)

1. Every primitive lives under exactly one bucket; composites import down the dependency tree only (`cells/` → `dropdowns/`, `cells/` → `badges/`).
2. `contracts/` subfolders are types-only — no JSX, no React imports.
3. No primitive imports from `apps/web/modules/`, `@/server/`, `@builders/db`, `@builders/application`, or any module-specific code.
4. Every primitive accepts `editable: boolean` — edit modality is a contract, not a separate component.
5. No baked-in chrome — primitives render only what they're for; consumers compose containers.
6. `features/` are opt-in side-cars that don't know about each other; the grid imports zero features.
7. Naming drops the `Record` prefix (engine versions keep it; no name collisions during parallel run).
8. Named exports only.
9. No "smart" defaults inherited from the engine — defaults are documented in `grid-cell-kind.ts` but not auto-applied.

## What did not happen (per plan)

- **No engine touch.** `git diff apps/web/modules/shared/engines/` returns empty.
- **No module touch.** `git diff apps/web/modules/{imports,inventory,products,manufacturers,warehouses,work-orders,management}/` returns empty.
- **No dashboard page touch.**
- **No controllers shipped.** Only the placeholder CLAUDE.md.
- **No new behavior.** Search hardening / scroll virtualization / multi-select dropdown all reserved on contracts; implementations are simple-cases-only.

## Verification

- `npm run typecheck --workspace @builders/web` → 57 errors total, identical to the sweep 4e baseline. Zero are in `apps/web/components/**`.
- File-count check: `find apps/web/components -type f | wc -l` → 56. `find apps/web/controllers -type f | wc -l` → 1. Matches plan inventory.
- Bucket dependency check: `cells/` imports `dropdowns/` and `badges/` only; `dropdowns/` imports nothing from `cells/`; `grid/` imports nothing from `features/`. Discipline rules respected.
- Engine and module unchanged: `git status apps/web/modules/` shows no modifications.

## Out of scope after this sweep (sequenced for next sweeps)

1. **Migrate the imports staged-inventory section** to the new primitives. First real consumer; will surface contract gaps. Replace `RecordSectionGrid` with `Grid`, the engine cells with the new typed cells, `RecordRowStatusBadge` with `StatusBadge`, the section shell with `SectionHeader` + `Grid`.
2. **Build the mark-for-import workflow controller** in `apps/web/controllers/`. Consumes `CheckboxCell` for the row-selection column, `ActionHeader` for the Run Import button + phase indicator. Adds `GET /api/imports/[id]/staged-inventory-rows` for polling refresh; wraps `usePendingWorkflowPolling` from the existing engine.
3. **Migrate other imports surfaces** (primary section, list view) to the new primitives.
4. **Migrate inventory + products + manufacturers + warehouses + work-orders + management** modules — one per sweep, each tightening contract gaps.
5. **Retire engine files** once nothing imports them.
6. **Search hardening** (fuzzy match, async load, multi-key) and **scroll virtualization** for large lists.
