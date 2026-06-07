# Web App

Next.js app. UI, client-side orchestration, API routes, dashboard pages.

## Subdirectories with their own CLAUDE.md

- [ ] `app/` — see `apps/web/app/CLAUDE.md`
- [ ] `components/` — see `apps/web/components/CLAUDE.md`
- [ ] `modules/` — see `apps/web/modules/CLAUDE.md`
- [ ] `server/` — see `apps/web/server/CLAUDE.md`

## `controllers/`

Generic, reusable controller hooks. (Not preffered but, module-specific controllers live in `modules/<module>/controllers/`.)

- [ ] `expandable-rows/` — expandable-row controller
- [ ] Record controllers now live inside the record-view engine — see `engines/record-view/client/controllers/`.
- [ ] List controllers now live inside the list-view engine — see `engines/list-view/client/` (server list controller, URL bindings, list-view contracts).
- [ ] The async dropdown controller now lives inside the dropdowns engine — see `engines/dropdowns/client/` (`use-async-rich-dropdown-controller`).

## `hooks/`

Generic React hooks for the dashboard.

- [ ] `navigation/` — routes table + record-entry navigation hook
- [ ] Record hooks (dirty-state, close-guard, notices, section-workflow, pending-workflow polling) now live inside the record-view engine — see `engines/record-view/client/hooks/`.

## `query-policies/`

React-query freshness presets shared outside the list-view engine.

- [ ] `index.ts` — `FRESH_ON_OPEN` (always-stale + refetch-on-mount). Consumed by the dropdowns engine's async controller, so it stays here as a shared primitive outside that engine. The list-view freshness presets (`ListFreshness` type + `LIST_FRESHNESS_LIVE`/`STANDARD`/`OFF`) now live in the list-view engine — see `engines/list-view/policies/`.

## `engines/`

Self-contained, reusable UI engines. Each engine owns its components, controllers, hooks, and contracts and exposes a single public surface via its root `index.ts` barrel — consumers import from `@/engines/<name>`, never from deep paths. (`modules/shared/engines/` has been fully retired in favor of this directory.)

- [ ] `record-view/` — the canonical record detail/create engine (work-orders, templates, imports, products). Public surface: `@/engines/record-view`. Internals: `client/` (scaffolds, controllers, hooks, utils), `panel/`, `shell/`, `sections/`, `feedback/`, `forms/`, `adapters/`, `contracts/`. Depends outward only on shared primitives (`@/types`, `@/components/dialogs`, `@/components/theme`, `@/transport`); nothing reaches back into it.
- [ ] `list-view/` — the canonical list/table page engine (all dashboard list views). Public surface: `@/engines/list-view`. Internals: `client/` (server list controller, contracts, nuqs url-bindings), `table/` (the `DataTable` primitive), `toolbar/` (`list-toolbar`, `search`, `filter`, `paginate`, `sort`, `group`), `policies/` (`LIST_FRESHNESS_*`). Self-contained; consumers import only from the barrel. `Grid` stays in `@/components/grid` (record-view sub-grids + categories/uom); the `select-batch`/`duplicate-row` row side-cars stay in `@/components/features`.
- [ ] `dropdowns/` — the canonical dropdown/picker engine (every module picker, list filter chip, and `cells/dropdown-cell`). Public surface: `@/engines/dropdowns`. Internals: `controls/` (`SelectDropdown`, `AsyncRichDropdown`, `SegmentedDropdown`, `AnchoredPanel`, `positioning/`), `contracts/` (`DropdownOption`, `DropdownFeatures`), `client/` (`useAsyncRichDropdownController` — debounced search + paginated query that refetches on open via `FRESH_ON_OPEN`). Self-contained (React only). The surviving side-panel picker chrome is separate and stays: `@/components/hub-side-panel` (picker, picker-trigger, edit-layout, add-button). The old preview clear button has moved into the record-view engine as a reference-header primitive — `ReferenceHeaderClearButton` from `@/engines/record-view` (`engines/record-view/shell/reference-header/`). The old side-panel *system* — the `engines/side-panel` freshness engine, `components/side-panel-edit`, `components/side-panel-preview`, and the unused hub/preview chrome — has been removed; the only remaining side-panel *UX* is the adjustments edit panel (`modules/adjustments/.../adjustment-side-panel`), still pending its own migration.

## `tests/`

Test code only — no app runtime imports it.

- [ ] `e2e/` — Playwright dashboard smoke
- [ ] `engines/` — list-view + record-view engine tests
- [ ] `modules/` — per-module unit/integration tests
- [ ] `server/` — auth, db, http, platform tests
- [ ] `shared/` — architecture boundary tests + shared utility tests
- [ ] `helpers/` — test mocks (next-navigation, route-error, simple-table)

## `transport/`

Client-side HTTP + mutation envelope helpers.

- [ ] `http.ts` — `requestJson` + `RequestJsonError`
- [ ] `mutation.ts` — `withMutationMeta`, `getConflictSnapshot`, `isConflictError`
- [ ] `client-errors.ts` — `getClientErrorMessage`
- [ ] `index.ts` — barrel
