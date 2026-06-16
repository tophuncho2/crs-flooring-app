# Web App

Next.js app. UI, client-side orchestration, API routes, dashboard pages.

## Subdirectories with their own CLAUDE.md

- [ ] `app/` — see `apps/web/app/CLAUDE.md`
- [ ] `modules/` — see `apps/web/modules/CLAUDE.md`
- [ ] `server/` — see `apps/web/server/CLAUDE.md`

## Controllers

The top-level `controllers/` directory has been retired — every controller hook now lives inside the engine that owns it:

- [ ] Record controllers (including the `expandable-rows` toggle) now live inside the record-view engine — see `engines/record-view/client/controllers/`.
- [ ] List controllers now live inside the list-view engine — see `engines/list-view/client/` (server list controller, URL bindings, list-view contracts).
- [ ] The async dropdown controller now lives inside the picker engine — see `engines/picker/client/` (`use-async-rich-dropdown-controller`).

(Not preferred but, module-specific controllers live in `modules/<module>/controllers/`.)

## `hooks/`

Generic React hooks for the dashboard.

- [ ] `navigation/` — routes table + record-entry navigation hook
- [ ] Record hooks (dirty-state, close-guard, notices, section-workflow, pending-workflow polling) now live inside the record-view engine — see `engines/record-view/client/hooks/`.

## `query-policies/`

React-query freshness presets shared outside the list-view engine.

- [ ] `index.ts` — `FRESH_ON_OPEN` (always-stale + refetch-on-mount). Consumed by the picker engine's async controller, so it stays here as a shared primitive outside that engine. The list-view freshness presets (`ListFreshness` type + `LIST_FRESHNESS_LIVE`/`STANDARD`/`OFF`) now live in the list-view engine — see `engines/list-view/policies/`.

## `engines/`

Self-contained, reusable UI engines. Each engine owns its components, controllers, hooks, and contracts and exposes a single public surface via its root `index.ts` barrel — consumers import from `@/engines/<name>`, never from deep paths. (`modules/shared/engines/` and the old top-level `components/` + `controllers/` directories have all been fully retired in favor of this directory.)

- [ ] `common/` — the cross-engine shared primitive layer (the base both view engines depend on). Public surface: `@/engines/common`. Internals: `contracts/` (the shared `CellTone` tone vocabulary), `controls/` (the paired cell/row icon affordances — `CellActionButton`, `RecordOpenButton`, `CellAddButton`, `RecordOptionsMenu` — plus the shared `AnchoredPanel` popover chrome and `positioning/` geometry, used by both the menu and the picker dropdowns), `headers/` (`SectionHeader`, `ActionHeader`), `badges/` (`StatusBadge`, `AdjustmentStatusBadge`), `feedback/` (`notices/` + centered `states/`), `theme/` (`accent-styles` brand tokens). These are the primitives used by *both* the list and record domains (list clients + record sections + dashboard pages). Depends on nothing else in `engines/`; the other engines depend inward on it, never the reverse.
- [ ] `record-view/` — the canonical record detail/create engine (work-orders, templates, imports, products). Public surface: `@/engines/record-view`. Internals: `client/` (scaffolds, controllers — incl. `expandable-rows` — hooks, utils), `panel/`, `shell/`, `sections/`, `feedback/`, `forms/`, `adapters/`, `contracts/`, plus the record-domain UI primitives `cells/`, `fields/`, `layout-grid/`, `grid/` (incl. `expandable-rows`), `features/` (`select-batch`/`duplicate-row` row side-cars), `dialogs/` (`ConfirmDialog` + `confirmRecordDelete`), and `composites/` (`property-fields`). Depends outward only on shared primitives (`@/types`, `@/engines/common`, `@/engines/picker`, `@/transport`); nothing reaches back into it.
- [ ] `list-view/` — the canonical list/table page engine (all dashboard list views). Public surface: `@/engines/list-view`. Internals: `client/` (server list controller, contracts, nuqs url-bindings), `table/` (the `DataTable` primitive), `toolbar/` (`list-toolbar`, `search`, `filter`, `paginate`, `sort`, `group`), `policies/` (`LIST_FRESHNESS_*`). Self-contained; consumers import only from the barrel.
- [ ] `picker/` — the canonical dropdown/picker engine (every module picker, list filter chip, `cells/dropdown-cell`, and the templates cascade picker). Public surface: `@/engines/picker`. Merges the former `dropdowns` + `cascade-picker` engines and the old hub picker chrome into one engine. Internals: `contracts/` (`DropdownOption`, `DropdownFeatures`), `controls/` (`SelectDropdown`, `AsyncRichDropdown`, `SegmentedDropdown` — the `AnchoredPanel` popover chrome + `positioning/` they share now live in `@/engines/common`), `client/` (`useAsyncRichDropdownController` — debounced search + paginated query that refetches on open via `FRESH_ON_OPEN`), `chrome/` (`PickerList`, `PickerTrigger`, `PickerEditLayout`, `PickerAddButton` — the picker shell primitives, formerly `components/hub-side-panel`), `cascade/` (the shared MC→Property→Template cascade picker — self-contained `client/components/contracts/`; templates today, work-orders next). Self-contained (React only). The old preview clear button moved into the record-view engine as a reference-header primitive — `ReferenceHeaderClearButton` from `@/engines/record-view` (`engines/record-view/shell/reference-header/`). The old side-panel *system* — the `engines/side-panel` freshness engine, `components/side-panel-edit`, `components/side-panel-preview`, the `hub-side-panel` chrome, and the standalone `dropdowns`/`cascade-picker` engines — has been removed/merged; the only remaining side-panel *UX* is the adjustments edit panel (`modules/adjustments/.../adjustment-side-panel`), still pending its own migration.

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
