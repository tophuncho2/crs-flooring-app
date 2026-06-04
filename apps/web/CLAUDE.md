# Web App

Next.js app. UI, client-side orchestration, API routes, dashboard pages.

## Subdirectories with their own CLAUDE.md

- [ ] `app/` — see `apps/web/app/CLAUDE.md`
- [ ] `components/` — see `apps/web/components/CLAUDE.md`
- [ ] `modules/` — see `apps/web/modules/CLAUDE.md`
- [ ] `server/` — see `apps/web/server/CLAUDE.md`

## `controllers/`

Generic, reusable controller hooks. (Not preffered but, module-specific controllers live in `modules/<module>/controllers/`.)

- [ ] `dropdown-search/` — `use-async-rich-dropdown-controller` (async picker w/ search)
- [ ] `list-view/` — server list controller, URL bindings, table preferences, list-view contracts
- [ ] `expandable-rows/` — expandable-row controller
- [ ] Record controllers now live inside the record-view engine — see `engines/record-view/client/controllers/`.

## `hooks/`

Generic React hooks for the dashboard.

- [ ] `navigation/` — routes table + record-entry navigation hook
- [ ] Record hooks (dirty-state, close-guard, notices, section-workflow, pending-workflow polling) now live inside the record-view engine — see `engines/record-view/client/hooks/`.

## `query-policies/`

React-query freshness presets for list views.

- [ ] `index.ts` — `ListFreshness` type + `LIST_FRESHNESS_LIVE`, `LIST_FRESHNESS_STANDARD`, `LIST_FRESHNESS_OFF` (refetch interval + stale time)

## `engines/`

Self-contained, reusable UI engines. Each engine owns its components, controllers, hooks, and contracts and exposes a single public surface via its root `index.ts` barrel — consumers import from `@/engines/<name>`, never from deep paths. (`modules/shared/engines/` is being retired in favor of this directory.)

- [ ] `record-view/` — the canonical record detail/create engine (work-orders, templates, imports, products). Public surface: `@/engines/record-view`. Internals: `client/` (scaffolds, controllers, hooks, utils), `panel/`, `shell/`, `sections/`, `feedback/`, `forms/`, `adapters/`, `contracts/`. Depends outward only on shared primitives (`@/types`, `@/components/dialogs`, `@/transport`, `@/modules/shared/engines/common`); nothing reaches back into it.
- [ ] `side-panel/` — side-panel freshness/refresh engine.

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
