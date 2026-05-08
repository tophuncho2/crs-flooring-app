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
- [ ] `record/` — record page / detail / section controllers, batch-select actions, single-section create + record controllers

## `hooks/`

Generic React hooks for the dashboard.

- [ ] `navigation/` — routes table + record-entry navigation hook
- [ ] `record/` — record dirty-state, close-guard, notices, section-workflow, pending-workflow polling

## `query-policies/`

React-query freshness presets for list views.

- [ ] `index.ts` — `ListFreshness` type + `LIST_FRESHNESS_LIVE`, `LIST_FRESHNESS_STANDARD`, `LIST_FRESHNESS_OFF` (refetch interval + stale time)

## `scaffolds/`

Shared client-side shells used by record-view modules.

- [ ] `record-detail-client-scaffold.tsx` — wraps a record detail view with the page controller
- [ ] `record-create-client-scaffold.tsx` — wraps a record create view
- [ ] `record-detail-page-shell.tsx` — page layout shell for record detail
- [ ] `record-primary-header.tsx` — primary header chrome for the record page

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
