# `apps/web/components/` — UI Primitives

Pure UI primitives. Modules and routes consume these; nothing in here knows about modules, routes, or domain shape.

## Discipline rules

1. **Every primitive lives under exactly one bucket.** Buckets: `grid/`, `cells/`, `dropdowns/`, `badges/`, `headers/`, `features/`. Composites import down the dependency tree, never sideways: `cells/` may import `dropdowns/` and `badges/`; `dropdowns/` never imports `cells/`.

2. **`contracts/` subfolders contain only types, type aliases, enums, and helper functions over those types.** No JSX. No React imports.

3. **No primitive imports from `apps/web/modules/`, `@/server/`, `@builders/db`, `@builders/application`, or any module-specific code.** Components are pure UI. Domain types from `@builders/domain` are allowed only when a format adapter genuinely needs them.

4. **Every primitive accepts `editable: boolean` (or its absence implies `false`).** Edit modality is part of the contract, not a separate component variant. A `text-cell` with `editable: false` renders a styled `<span>`; with `editable: true` it renders an `<input>`.

5. **No baked-in chrome.** A primitive renders only itself plus its directly-required structure. Containers (panels, scroll wrappers, action headers) are separate primitives consumers compose.

6. **Feature layers under `features/` are opt-in side-cars.** They never know about each other. The `search-control` doesn't care if `sort-toggle` is also rendered. The grid doesn't import any feature.

7. **Naming: drop the `Record` prefix.** New primitives are `Grid`, `TextCell`, `SelectDropdown`, `StatusBadge`, `SearchControl`. The engine versions under `apps/web/modules/shared/engines/` keep `Record*`; no name collisions during the parallel-run period.

8. **Named exports only.** No default exports. Barrels re-export named symbols only.

9. **No "smart" defaults inherited from the engine.** Per-kind defaults (e.g. status → center alignment) are documented in `grid-cell-kind.ts` but not auto-applied. Primitives stay pure.

## Bucket purpose

- **`grid/`** — universal grid contract + shell. Subsumes both list-view tables and record-view sub-grids. Feature-agnostic; consumer composes.
- **`cells/`** — cell renderers (text, number, currency, unit, per-unit, select, dropdown, status, checkbox). One file per kind. Every cell honors the editability contract.
- **`dropdowns/`** — standalone dropdown primitives. Used by `cells/dropdown-cell.tsx` and by consumers that need a dropdown outside a grid cell.
- **`badges/`** — status pills + tone-coded indicators.
- **`headers/`** — section headers, action headers (title + status surface + actions panel).
- **`features/{search,sort,group,paginate}/`** — opt-in feature layers. Each ships a contract + a JSX control that consumers slot wherever they want.

## Migration status

This tree is **scaffolding**. Consumers (modules, sections, dashboard pages) currently still import from `apps/web/modules/shared/engines/record-view/` and `apps/web/modules/shared/engines/list-view/`. Migration happens module-by-module in subsequent sweeps; the engine stays in place until nothing imports it.
