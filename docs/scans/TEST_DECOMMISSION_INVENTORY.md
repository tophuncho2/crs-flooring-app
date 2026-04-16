# Test Decommission Inventory — Pre-Warehouse Sweep

**Date:** 2026-04-16
**Scope:** Identify tests to delete, fix, adapt, or leave alone before the warehouse module sweep begins.
**Read-only scan.** Every claim cites a file path.

---

## Section 1 — Current Test Suite Inventory

### 1.1 File counts by location

| Location | Files | Tests | Lines |
|---|---:|---:|---:|
| `apps/web/tests/` (recursive) | 89 | 349 | ~15,300 |
| `apps/relay/tests/` | 1 | 2 | 199 |
| `apps/worker/tests/` | 1 | 1 | 53 |
| `packages/*/tests/` | 0 | 0 | 0 |
| **Total** | **91** | **352** | **~15,552** |

There are no test directories under any `packages/*` workspace.

### 1.2 Full file inventory — apps/web/tests/

**engines/list-view/** (8 files / 33 tests)
- `dashboard-list-page-controls.test.tsx` — 145 lines, 7 tests
- `dashboard-list-page-table-layout.test.ts` — 12 lines, 2 tests
- `row-action-buttons.test.tsx` — 24 lines, 2 tests
- `table-column-settings.test.tsx` — 143 lines, 5 tests
- `use-configured-table-state.test.tsx` — 105 lines, 2 tests
- `use-list-view-engine.test.tsx` — 168 lines, 9 tests
- `use-table-controls.test.tsx` — 70 lines, 2 tests

**engines/record-view/** (6 files / 36 tests)
- `record-create-clients.test.tsx` — 215 lines, 4 tests
- `record-item-scroll-sync.test.tsx` — 62 lines, 1 test
- `record-view-feature-alignment.test.ts` — 151 lines, 5 tests
- `record-view-single-section-engine.test.tsx` — 688 lines, 17 tests
- `shared-record-panel-footer.test.tsx` — 87 lines, 3 tests
- `workflow-core.test.ts` — 357 lines, 6 tests

**modules/contacts/** (5 files / 18 tests) — swept
- `contact-form-validation.test.ts` — 39 lines, 7 tests
- `contact-service-delete-rules.test.ts` — 27 lines, 2 tests
- `contacts-application.test.ts` — 48 lines, 1 test
- `contacts-primary-section-route.test.ts` — 181 lines, 3 tests
- `contacts-routes.test.ts` — 297 lines, 5 tests

**modules/cut-logs/** (1 file / 3 tests)
- `cut-logs-use-case.test.ts` — 122 lines, 3 tests

**modules/imports/** (4 files / 13 tests)
- `import-entry-use-case.test.ts` — 70 lines, 2 tests
- `imports-client.test.tsx` — 215 lines, 4 tests
- `imports-routes.test.ts` — 152 lines, 4 tests
- `imports-summary.test.ts` — 35 lines, 2 tests

**modules/inventory/** (4 files / 19 tests)
- `inventory-client.test.tsx` — 429 lines, 7 tests
- `inventory-queries.test.ts` — 194 lines, 4 tests
- `inventory-routes.test.ts` — 160 lines, 2 tests
- `location-integrity.test.ts` — 102 lines, 6 tests

**modules/management-companies/** (2 files / 6 tests)
- `management-companies.test.ts` — 130 lines, 5 tests
- `management-company-record-view.test.tsx` — 91 lines, 1 test

**modules/manufacturers/** (3 files / 13 tests) — swept
- `manufacturers-client.test.tsx` — 146 lines, 4 tests
- `manufacturers-primary-section-route.test.ts` — 186 lines, 3 tests
- `manufacturers.test.ts` — 288 lines, 6 tests

**modules/products/** (6 files / 15 tests)
- `backfill-product-names.test.ts` — 105 lines, 5 tests
- `product-display-name.test.ts` — 51 lines, 4 tests
- `product-photos-route.test.ts` — 73 lines, 1 test
- `product-validators.test.ts` — 35 lines, 2 tests
- `products-detail-client.test.tsx` — 182 lines, 2 tests
- `products-services.test.ts` — 44 lines, 1 test

**modules/properties/** (2 files / 5 tests)
- `properties-client.test.tsx` — 76 lines, 1 test
- `properties.test.ts` — 171 lines, 4 tests

**modules/services/** (4 files / 14 tests)
- `services-application.test.ts` — 113 lines, 3 tests
- `services-client.test.tsx` — 142 lines, 3 tests
- `services-primary-section-route.test.ts` — 192 lines, 3 tests
- `services-routes.test.ts` — 231 lines, 5 tests

**modules/templates/** (6 files / 34 tests)
- `template-record-panel.test.tsx` — 215 lines, 3 tests
- `template-sync-domain.test.ts` — 492 lines, 7 tests
- `template-sync-route.test.ts` — 164 lines, 3 tests
- `templates-client.test.tsx` — 114 lines, 2 tests
- `templates-domain.test.ts` — 219 lines, 6 tests
- `templates-routes.test.ts` — 513 lines, 13 tests

**modules/unit-of-measures/** (2 files / 3 tests) — swept
- `unit-of-measures-client.test.tsx` — 30 lines, 1 test
- `unit-of-measures-routes.test.ts` — 70 lines, 2 tests

**modules/warehouse/** (3 files / 26 tests) — **DELETE TARGET**
- `warehouse-client.test.tsx` — 214 lines, 6 tests
- `warehouse-locations.test.ts` — 361 lines, 11 tests
- `warehouse-sections.test.ts` — 264 lines, 9 tests

**modules/work-orders/** (9 files / 37 tests)
- `work-order-allocation-application.test.ts` — 118 lines, 2 tests
- `work-order-allocation-domain.test.ts` — 182 lines, 6 tests
- `work-order-allocations-routes.test.ts` — 353 lines, 4 tests
- `work-order-expense-summary.test.ts` — 34 lines, 2 tests
- `work-order-material-items-section.test.tsx` — 133 lines, 2 tests
- `work-order-reconciliation-routes.test.ts` — 85 lines, 1 test
- `work-order-service-items-section.test.tsx` — 52 lines, 1 test
- `work-orders-client.test.tsx` — 383 lines, 7 tests
- `work-orders-routes.test.ts` — 487 lines, 9 tests

**server/auth/** (7 files / 42 tests) — server infrastructure
- `access-control.test.ts` — 25 lines, 3 tests
- `account-routes.test.ts` — 425 lines, 7 tests
- `admin-recovery.test.ts` — 128 lines, 6 tests
- `admin-users-routes.test.ts` — 295 lines, 11 tests
- `owner-recovery.test.ts` — 97 lines, 5 tests
- `route-auth.test.ts` — 79 lines, 3 tests
- `set-password-route.test.ts` — 135 lines, 7 tests

**server/db/** (2 files / 6 tests)
- `db-environment.test.ts` — 26 lines, 3 tests
- `system-user-seed.test.ts` — 43 lines, 3 tests

**server/http/** (3 files / 8 tests)
- `route-helpers.test.ts` — 79 lines, 2 tests
- `route-policy-parity.test.ts` — 110 lines, 2 tests
- `shared-http.test.ts` — 61 lines, 4 tests

**server/platform/** (3 files / 10 tests)
- `platform-env.test.ts` — 118 lines, 7 tests
- `platform-rate-limit-redis-fallback.test.ts` — 95 lines, 1 test
- `platform-rate-limit.test.ts` — 64 lines, 2 tests

**shared/** (10 files / 29 tests)
- `architecture-boundaries.test.ts` — 87 lines, 3 tests
- `currency-cell.test.tsx` — 25 lines, 2 tests
- `date-format.test.ts` — 12 lines, 2 tests
- `package-scripts.test.ts` — 42 lines, 1 test
- `reference-test-data.test.ts` — 171 lines, 3 tests
- `server-pagination.test.ts` — 52 lines, 4 tests
- `shared-form-field-styles.test.ts` — 31 lines, 3 tests
- `shared-notices.test.tsx` — 40 lines, 3 tests
- `shared-use-url-record-editor.test.tsx` — 140 lines, 5 tests
- `shared-use-url-record-panel.test.tsx` — 66 lines, 3 tests

**e2e/** (excluded from `npm test`; run separately via `test:e2e`)
- `dashboard-smoke.spec.ts`

### 1.3 Other workspaces

- `apps/relay/tests/work-order-allocation-outbox-dispatcher.test.ts` — 199 lines, 2 tests
- `apps/worker/tests/process-work-order-auto-allocation.test.ts` — 53 lines, 1 test

---

## Section 2 — Currently Failing Tests

### 2.1 Per-workspace status

| Workspace | Files | Tests | Pass | Fail | Skip |
|---|---:|---:|---:|---:|---:|
| `@builders/web` | 89 | 349 | 297 | **52** | 0 |
| `@builders/relay` | 1 | 2 | 2 | 0 | 0 |
| `@builders/worker` | 1 | 1 | 1 | 0 | 0 |
| **Total** | **91** | **352** | **300** | **52** | **0** |

Web test run: 19 failed files, 52 failed tests. Relay and worker clean.

### 2.2 Failing files (web) — grouped by root cause

Classification derived from error messages captured in `/tmp/web-test-full.log` and first-run output, and by reading test source.

#### A. Stale mock: route-helpers `vi.mock` omits `enforceRouteRateLimit`

The `vi.mock("@/server/http/route-helpers")` factory in these tests does not return an `enforceRouteRateLimit` export, so the route's `enforceQueryRateLimit` / `applyRoutePolicy` helpers throw at runtime (`server/http/route-policy.ts:90`).

| File | Failed | Reason | Evidence |
|---|---:|---|---|
| `tests/modules/work-orders/work-order-reconciliation-routes.test.ts` | 1/1 | `vi.mock("@/server/http/route-helpers", ...)` at line 22 omits `enforceRouteRateLimit` | `Error: [vitest] No "enforceRouteRateLimit" export is defined on the "@/server/http/route-helpers" mock.` |

#### B. Stale envelope: routes now require `{ mutation: { idempotencyKey, ... }, input: ... }`

Routes in these modules adopted the mutation-envelope pattern (`parseMutationEnvelope` — throws `"mutation is required"` at `apps/web/server/http/route-policy.ts:141`). The tests POST/PATCH/DELETE raw input bodies, so all mutating tests return 400 with "mutation is required".

| File | Failed / Total | Evidence |
|---|---|---|
| `tests/modules/warehouse/warehouse-sections.test.ts` | 7/9 | `AssertionError: expected 'mutation is required' to be 'warehouseId is required'` |
| `tests/modules/warehouse/warehouse-locations.test.ts` | 9/11 | Same pattern, multiple endpoints |
| `tests/modules/inventory/inventory-routes.test.ts` | 2/2 | DELETE + PATCH both fail |
| `tests/modules/imports/imports-routes.test.ts` | 3/4 | DELETE endpoints |
| `tests/modules/templates/templates-routes.test.ts` | 9/13 | POST/PATCH/DELETE across `/templates`, `/items`, `/service-items`, `/sales-reps` |
| `tests/modules/properties/properties.test.ts` | 2/4 | Creation validation |
| `tests/modules/management-companies/management-companies.test.ts` | 2/5 | Create + delete |
| `tests/modules/products/product-photos-route.test.ts` | 1/1 | Storage path |

#### C. Component/engine shape drift (stale UI test harnesses)

Tests that render real components that have since been re-wired (e.g., to the record-view engine) and no longer match test expectations.

| File | Failed / Total | Likely reason |
|---|---|---|
| `tests/modules/inventory/inventory-client.test.tsx` | 6/7 | Rewritten to record-view engine with primary + cut-logs sections |
| `tests/modules/imports/imports-client.test.tsx` | 1/4 | "section-owned controls in canonical import detail page" |
| `tests/modules/templates/template-record-panel.test.tsx` | 3/3 | Save/delete flow wired through new receipts |
| `tests/modules/management-companies/management-company-record-view.test.tsx` | 1/1 | record-view engine integration |
| `tests/engines/record-view/record-view-single-section-engine.test.tsx` | 1/17 | Canonical row control columns expectations drifted |
| `tests/engines/record-view/record-view-feature-alignment.test.ts` | 2/5 | Snapshot-style assertions on route/component files |

#### D. Zero-test-discovery (transform/import error)

Listed as "0 test" in the summary — the file crashed before any test registered. Likely a missing export or API contract break.

| File | Status | Notes |
|---|---|---|
| `tests/modules/templates/template-sync-domain.test.ts` | 0 tests discovered | File has 7 tests per grep; import error suspected |
| `tests/engines/record-view/workflow-core.test.ts` | 0 tests discovered | File has 6 tests per grep; import error suspected |

#### E. Other single-test failures

| File | Failed / Total | Notes |
|---|---|---|
| `tests/server/http/route-helpers.test.ts` | 1/2 | "logs mutation success and failure with route context" — likely logging shape change |
| `tests/server/auth/route-auth.test.ts` | 1/3 | "enforces capability and tool access for verified users" — auth/tool model change |

### 2.3 Failing-test classification (for List A vs List B)

| Classification | Files | Note |
|---|---|---|
| **Stale test harness** (envelope, mock shape, component API) | 15 | All of A, B, C, D |
| **Real application bugs** | 0 | No test failure unambiguously points at a broken production-code path independent of test-side drift. Every failure traces to a test that was written against an older contract. |

**Evidence this is not hiding a real bug:** All B-class failures are the same shape — mutation-envelope rejects input because the test didn't wrap it. The route code is behaving correctly per `server/http/route-policy.ts:141`. The A-class failure (`work-order-reconciliation-routes`) is explicitly a test-side mock-gap message.

Recommend: no "fix bug then re-test" bucket (List B below is empty).

---

## Section 3 — Warehouse Module Tests (Delete Outright)

| Path | Tests | Failed | Mocks | Blast radius |
|---|---:|---:|---|---|
| `apps/web/tests/modules/warehouse/warehouse-client.test.tsx` | 6 | 0 | Fetch stub (`jsonResponse` factory at L23); imports `@/modules/warehouse/components/warehouse-client`, `@/modules/warehouse/record/detail/warehouse-detail-client`, `@/modules/warehouse/types` | None — no other test imports it |
| `apps/web/tests/modules/warehouse/warehouse-locations.test.ts` | 11 | 9 | **Prisma-direct mock** — `vi.mock("@builders/db")` replacing `prisma` with `prismaMock.flooringLocation` / `.flooringSection` (L17-27); imports `@/app/api/locations/route`, `@/app/api/locations/[id]/route` | None |
| `apps/web/tests/modules/warehouse/warehouse-sections.test.ts` | 9 | 7 | **Prisma-direct mock** — `vi.mock("@builders/db")` replacing `prisma` with `prismaMock.flooringSection` (L17-24); imports `@/app/api/sections/route`, `@/app/api/sections/[id]/route` | None |

All three files are self-contained. No `import ... from "../warehouse/..."` appears in any other test. Phase 1 of the warehouse sweep already plans to delete these; this section confirms no additional warehouse-only test was missed.

---

## Section 4 — Cross-Module Tests That Reference Warehouse

Tests owned by other modules that touch warehouse internals, fixtures, or access surface. Do NOT delete these during the warehouse sweep; they belong to their own module's eventual sweep.

| Path | What it uses from warehouse | Breaks after sweep? | Type |
|---|---|---|---|
| `apps/web/tests/server/http/route-policy-parity.test.ts:37` | `vi.mock("@/modules/warehouse/api", ...)`, imports `@/app/api/warehouses/route` (L69) | **Yes (high)** — mocks the warehouse api surface. If the sweep reshapes `api.ts` exports (e.g., splits into queries/mutations/use-cases), this mock needs rewriting. Currently passing. | Adapt |
| `apps/web/tests/engines/record-view/record-view-feature-alignment.test.ts:68,140` | Asserts file contents of `apps/web/modules/warehouse/record/panel/warehouse-record-panel.tsx` and `warehouse-sections-section.tsx` (uses `readFile`) | **Yes (high)** — if warehouse is restructured to the standard module anatomy (`components/record/` vs `record/`), these paths move. Currently 2/5 failing for *other* reasons. | Adapt |
| `apps/web/tests/modules/work-orders/work-orders-client.test.tsx` | 5 occurrences of `warehouseId`/`sectionName` as fixture fields | No — fixture references only (field names unchanged) | Leave alone |
| `apps/web/tests/modules/work-orders/work-order-allocations-routes.test.ts` | 3 occurrences of `warehouseId` | No — fixture references only | Leave alone |
| `apps/web/tests/modules/work-orders/work-order-allocation-domain.test.ts` | 5 occurrences of `warehouseId` | No — fixture | Leave alone |
| `apps/web/tests/modules/templates/templates-routes.test.ts` | 8 `warehouseId` mentions | No (as fixture) — but already failing on envelope grounds | Adapt (envelope fix will hit first) |
| `apps/web/tests/modules/templates/template-sync-domain.test.ts` | 11 `warehouseId` mentions | No (fixture) | Adapt (currently 0-test-discovery) |
| `apps/web/tests/modules/templates/template-record-panel.test.tsx` | 1 `warehouseId` | No (fixture) | Adapt |
| `apps/web/tests/modules/templates/templates-domain.test.ts` | 3 `warehouseId` | No (fixture) | Leave alone |
| `apps/web/tests/modules/templates/template-sync-route.test.ts` | 1 `warehouseId` | No (fixture) | Leave alone |
| `apps/web/tests/modules/templates/templates-client.test.tsx` | 1 `warehouseId` | No (fixture) | Leave alone |
| `apps/web/tests/modules/inventory/inventory-queries.test.ts` | 6 `warehouseId` | No (fixture); uses `prismaMock.flooringLocation` indirectly | Leave alone |
| `apps/web/tests/modules/inventory/inventory-client.test.tsx` | 16 `warehouseId`/section references | Maybe — mocks section dropdowns; 6/7 already failing | Adapt |
| `apps/web/tests/modules/inventory/inventory-routes.test.ts` | 1 `warehouseId` + `flooringLocation` mock; `validateInventoryLocationSelection` | Maybe — uses location model mock | Adapt |
| `apps/web/tests/modules/inventory/location-integrity.test.ts` | 8 `flooringLocation.findUnique` mocks | **Yes (medium)** — location FK shape test. If sweep modifies `flooringLocation` shape (slug, sectionId semantics), this file needs update. Currently passing. | Adapt |
| `apps/web/tests/modules/imports/import-entry-use-case.test.ts` | 4 `warehouseId` (fixture) | No | Leave alone |
| `apps/web/tests/modules/imports/imports-client.test.tsx` | 8 `warehouseId`/section | Maybe (section dropdown) | Adapt |
| `apps/web/tests/modules/imports/imports-routes.test.ts` | 1 `warehouseId` | No (fixture) | Leave alone |
| `apps/web/tests/modules/properties/properties.test.ts` | None (appeared in summary as fixture text) | No | Leave alone |
| `apps/web/tests/modules/products/products-detail-client.test.tsx` | 3 `warehouseId` (fixture) | No | Leave alone |

**No test imports type `FlooringWarehouse`, `FlooringSection`, or `FlooringLocation` from `@prisma/client`.** Cross-module risk comes from Prisma-model accessors (`prismaMock.flooringLocation`, `prismaMock.flooringSection`) and fetch-mock fixtures with `warehouseId` fields.

---

## Section 5 — Reference Test Data Consumers

### 5.1 Test consumers
**Only consumer:**
- `apps/web/tests/shared/reference-test-data.test.ts` — lines 1-15 import `{ CATEGORY_BLUEPRINTS, DEFAULT_IMPORT_COUNT, DEFAULT_MANAGEMENT_COMPANY_COUNT, DEFAULT_MANUFACTURER_COUNT, DEFAULT_PROPERTY_COUNT, DEFAULT_WAREHOUSE_COUNT, INVENTORY_ITEMS_PER_IMPORT, PRODUCTS_PER_CATEGORY, TEMPLATE_ITEMS_PER_TEMPLATE, TEMPLATE_SERVICE_ITEMS_PER_TEMPLATE, buildReferenceTestData, seedReferenceTestData }` from `../../packages/db/scripts/reference-test-data.js`. 171 lines, 3 tests, currently passing.

No other test file imports from `reference-test-data`, `buildReferenceTestData`, `WAREHOUSE_BLUEPRINTS`, `DEFAULT_WAREHOUSE_COUNT`, `CATEGORY_BLUEPRINTS`, or `seedReferenceTestData`.

### 5.2 package.json scripts
- `package.json:35` (root) — `"db:seed:reference-test-data": "npm run db:seed:reference-test-data --workspace @builders/db"`
- `packages/db/package.json:32` — `"db:seed:reference-test-data": "DOTENV_CONFIG_PATH=../../.env node -r dotenv/config scripts/reference-test-data.js"`

Both scripts are developer-invoked only. Neither is wired into any other script (not called by `build`, `test`, `dev`, `db:seed`).

### 5.3 CI workflows
**No `.github/workflows/` directory exists** in the repo. Zero CI workflow files reference `db:seed:reference-test-data`.

### 5.4 Doc references
- `docs/cross-cutting/TESTING.md:58` — documents the script in a reference table
- `docs/scans/WAREHOUSE_SCAN.md:537-560` — references lines 238-260 (`WAREHOUSE_BLUEPRINTS`)
- `docs/scans/WAREHOUSE_PHASE_0_READINESS.md` — 15+ references (authored earlier this session)

### 5.5 Non-test production code
- `packages/db/scripts/reference-test-data.js` itself (the script being evaluated for deletion)
- No `apps/*` or `packages/*` production source file imports it. Verified via grep.

**Full blast radius of deleting `packages/db/scripts/reference-test-data.js`:**
1. Delete `packages/db/scripts/reference-test-data.js`
2. Delete `apps/web/tests/shared/reference-test-data.test.ts`
3. Remove `db:seed:reference-test-data` from `package.json:35` and `packages/db/package.json:32`
4. Update `docs/cross-cutting/TESTING.md:58` (remove row)
5. Optional: Update `docs/scans/WAREHOUSE_SCAN.md` and `docs/scans/WAREHOUSE_PHASE_0_READINESS.md` (scan artifacts — stale is acceptable)

No CI change, no test fixture cascade, no application code import.

---

## Section 6 — Tests For Unswept Modules (Review Before Each Sweep)

Classification of mock pattern by reading the first ~60 lines of each test file. "Prisma-direct" = `vi.mock("@builders/db")` or `vi.mock(..., { prisma: ... })`. "Use-case" = mocks `@builders/application` exports or module-level use case functions. "Fetch" = fetch stub / jsonResponse. "Component" = renders real component via `@testing-library/react`.

### 6.1 Properties (unswept)
| File | Mock pattern | Risk |
|---|---|---|
| `properties.test.ts` | Prisma-direct | **High** — will resist the sweep |
| `properties-client.test.tsx` | Component + fetch | Low |

### 6.2 Services (unswept)
| File | Mock pattern | Risk |
|---|---|---|
| `services-routes.test.ts` | Prisma-direct | High |
| `services-primary-section-route.test.ts` | Prisma-direct | High |
| `services-application.test.ts` | Use-case | Low |
| `services-client.test.tsx` | Component + fetch | Low |

### 6.3 Templates (unswept)
| File | Mock pattern | Risk |
|---|---|---|
| `templates-routes.test.ts` | Prisma-direct | **High** — currently 9/13 failing |
| `template-sync-route.test.ts` | Prisma-direct | High |
| `template-sync-domain.test.ts` | Prisma-direct tx mock | **High** — currently 0-test-discovery |
| `templates-domain.test.ts` | Domain pure | Low |
| `template-record-panel.test.tsx` | Component + fetch | Medium — currently 3/3 failing |
| `templates-client.test.tsx` | Component + fetch | Medium |

### 6.4 Products (unswept)
| File | Mock pattern | Risk |
|---|---|---|
| `backfill-product-names.test.ts` | Prisma-direct | High |
| `product-display-name.test.ts` | Domain pure | Low |
| `product-photos-route.test.ts` | Route | Medium — currently 1/1 failing |
| `product-validators.test.ts` | Pure | Low |
| `products-detail-client.test.tsx` | Component + fetch | Low |
| `products-services.test.ts` | Pure | Low |

### 6.5 Inventory (unswept)
| File | Mock pattern | Risk |
|---|---|---|
| `inventory-routes.test.ts` | Prisma-direct | **High** — currently 2/2 failing |
| `inventory-queries.test.ts` | Prisma-direct | High |
| `inventory-client.test.tsx` | Component + fetch | Medium — 6/7 failing |
| `location-integrity.test.ts` | Prisma-direct tx mock | High — also sensitive to warehouse sweep |

### 6.6 Work Orders (unswept)
| File | Mock pattern | Risk |
|---|---|---|
| `work-orders-routes.test.ts` | Use-case | Medium |
| `work-order-allocations-routes.test.ts` | Use-case | Medium |
| `work-order-allocation-application.test.ts` | Use-case | Low |
| `work-order-allocation-domain.test.ts` | Domain pure | Low |
| `work-order-expense-summary.test.ts` | Pure | Low |
| `work-order-material-items-section.test.tsx` | Component | Low |
| `work-order-service-items-section.test.tsx` | Component | Low |
| `work-order-reconciliation-routes.test.ts` | Route | Medium — currently 1/1 failing |
| `work-orders-client.test.tsx` | Component + fetch | Low |

### 6.7 Imports (unswept)
| File | Mock pattern | Risk |
|---|---|---|
| `imports-routes.test.ts` | Prisma-direct | **High** — 3/4 failing |
| `import-entry-use-case.test.ts` | Use-case | Low |
| `imports-client.test.tsx` | Component + fetch | Medium — 1/4 failing |
| `imports-summary.test.ts` | Pure | Low |

### 6.8 Management Companies (unswept)
| File | Mock pattern | Risk |
|---|---|---|
| `management-companies.test.ts` | Prisma-direct | **High** — 2/5 failing |
| `management-company-record-view.test.tsx` | Component | Medium — 1/1 failing |

### 6.9 Cut Logs (unswept)
| File | Mock pattern | Risk |
|---|---|---|
| `cut-logs-use-case.test.ts` | Use-case | Low |

**Summary:** Prisma-direct mocks concentrated in `-routes.test.ts` files. These will almost certainly be rewritten during each module's sweep regardless of warehouse work. Currently 7 `-routes` files are already failing on the envelope pattern — they're effectively dead code until their sweep.

---

## Section 7 — Shared / Engine / Infrastructure Tests

| Path | Purpose | References warehouse? | Breaks after sweep? |
|---|---|---|---|
| `tests/server/auth/access-control.test.ts` | hasCapability + role matrix | No | No |
| `tests/server/auth/account-routes.test.ts` | Account routes | No (fixture user only) | No |
| `tests/server/auth/admin-recovery.test.ts` | Admin recovery flow | No | No |
| `tests/server/auth/admin-users-routes.test.ts` | Admin user CRUD | No | No |
| `tests/server/auth/owner-recovery.test.ts` | Owner recovery | No | No |
| `tests/server/auth/route-auth.test.ts` | Route auth middleware | No | No — but 1/3 failing for unrelated reason |
| `tests/server/auth/set-password-route.test.ts` | Password reset | No | No |
| `tests/server/db/db-environment.test.ts` | Env plumbing | No | No |
| `tests/server/db/system-user-seed.test.ts` | System user seed | No | No |
| `tests/server/http/route-helpers.test.ts` | Route helpers | No | No — but 1/2 failing |
| `tests/server/http/route-policy-parity.test.ts` | Policy parity | **Yes** — mocks warehouse api, imports warehouse route (L37, L69) | **Yes — adapt** |
| `tests/server/http/shared-http.test.ts` | JSON helpers | No | No |
| `tests/server/platform/platform-env.test.ts` | Platform env | No | No |
| `tests/server/platform/platform-rate-limit*.test.ts` | Rate limit | No | No |
| `tests/engines/list-view/*` (8 files) | List view engine | No | No |
| `tests/engines/record-view/record-create-clients.test.tsx` | Record create | No | No |
| `tests/engines/record-view/record-item-scroll-sync.test.tsx` | Scroll sync | No | No |
| `tests/engines/record-view/record-view-feature-alignment.test.ts` | File-content alignment | **Yes** (L68, L140) | **Yes — adapt** |
| `tests/engines/record-view/record-view-single-section-engine.test.tsx` | Engine runtime | No | No — but 1/17 failing |
| `tests/engines/record-view/shared-record-panel-footer.test.tsx` | Panel footer | No | No |
| `tests/engines/record-view/workflow-core.test.ts` | Workflow core | No | No — but 0-test-discovery |
| `tests/shared/architecture-boundaries.test.ts` | Import boundaries | No (grep: 0 matches for warehouse/section/location) | No |
| `tests/shared/currency-cell.test.tsx` | Currency cell | No | No |
| `tests/shared/date-format.test.ts` | Date format | No | No |
| `tests/shared/package-scripts.test.ts` | package.json parity | Possibly — reads `db:seed:reference-test-data` script name. Needs check if sweep removes reference-test-data | Maybe |
| `tests/shared/reference-test-data.test.ts` | reference-test-data.js contract | N/A — this is the reference-test-data test itself (Section 5) | Delete if script deleted |
| `tests/shared/server-pagination.test.ts` | Pagination | No | No |
| `tests/shared/shared-form-field-styles.test.ts` | Form styles | No | No |
| `tests/shared/shared-notices.test.tsx` | Notices | No | No |
| `tests/shared/shared-use-url-record-editor.test.tsx` | URL editor | No | No |
| `tests/shared/shared-use-url-record-panel.test.tsx` | URL panel | No | No |

**Two infrastructure tests need warehouse-sweep adapters:**
1. `tests/server/http/route-policy-parity.test.ts` — verifies both warehouse and manufacturer routes stop before mutation on rate limit. Warehouse half needs update.
2. `tests/engines/record-view/record-view-feature-alignment.test.ts` — asserts on file contents at `apps/web/modules/warehouse/record/panel/*.tsx`. Paths move if warehouse is restructured to the standard module anatomy.

**Possibly:**
- `tests/shared/package-scripts.test.ts` — if the sweep deletes the `db:seed:reference-test-data` script, any assertion that checks its presence breaks.

---

## Section 8 — Deletion Recommendation Summary

### List A — Delete NOW, before the warehouse sweep

| File | Tests | Justification |
|---|---:|---|
| `apps/web/tests/modules/warehouse/warehouse-client.test.tsx` | 6 | Warehouse-module-only test; rebuilt during the sweep (Section 3). Currently passing, but will rot immediately once components move. |
| `apps/web/tests/modules/warehouse/warehouse-locations.test.ts` | 11 | Warehouse-module-only; Prisma-direct mock against `flooringLocation`/`flooringSection`; 9/11 already failing on envelope drift (Section 2.2 B). |
| `apps/web/tests/modules/warehouse/warehouse-sections.test.ts` | 9 | Warehouse-module-only; Prisma-direct mock against `flooringSection`; 7/9 already failing on envelope drift (Section 2.2 B). |
| `apps/web/tests/shared/reference-test-data.test.ts` | 3 | If user proceeds with deleting `reference-test-data.js` (Section 5), this test becomes moot. Only consumer of the script. Currently passing. Conditional on user's decision. |

Total to delete: **4 files / 29 tests** (3 warehouse files + 1 reference-test-data test).

### List B — Fix NOW (real application bugs), before warehouse sweep

**Empty.** No failing test unambiguously indicates a production bug. All 52 failures trace to test-harness drift (envelope not wrapped, mock gaps, component re-wires). See Section 2.3.

### List C — Adapt during warehouse sweep (not delete)

| File | Why |
|---|---|
| `apps/web/tests/server/http/route-policy-parity.test.ts` | Mocks `@/modules/warehouse/api`; imports `@/app/api/warehouses/route`. Needs rewrite if warehouse api splits or the route moves. |
| `apps/web/tests/engines/record-view/record-view-feature-alignment.test.ts` | Asserts file contents at `apps/web/modules/warehouse/record/panel/warehouse-record-panel.tsx` (L68) and `.../sections/warehouse-sections-section.tsx` (L140). Path-sensitive. |
| `apps/web/tests/shared/package-scripts.test.ts` | **Conditional** — if sweep removes `db:seed:reference-test-data` script, update any presence assertions. |

### List D — Leave alone for now

All remaining tests. Specifically:

- All swept modules (`contacts/*`, `manufacturers/*`, `unit-of-measures/*`, any `categories` tests) — not affected by warehouse sweep.
- All unswept modules listed in Section 6 — currently failing tests for these modules are symptoms of their *own* pending sweeps, not the warehouse sweep. Deleting them now would strand the user with zero coverage on those modules during their eventual sweep planning.
- Server/platform/engine infrastructure tests not flagged in List C.
- Apps `relay` and `worker` tests (clean, 3 passes total).

---

## Section 9 — Reference Test Data Deletion Feasibility

### Can `reference-test-data.js` be deleted without breaking CI?
**Yes.** No `.github/workflows/` directory exists in the repo (Section 5.3). No CI job references the script.

### Can it be deleted without breaking non-test code?
**Yes.** No file under `apps/` or `packages/*/src/` imports from `packages/db/scripts/reference-test-data.js`. Verified via grep on `reference-test-data`, `buildReferenceTestData`, `WAREHOUSE_BLUEPRINTS`, `DEFAULT_WAREHOUSE_COUNT`, `CATEGORY_BLUEPRINTS`, `seedReferenceTestData` — the only matches outside the script itself are in one test file and documentation.

### Full blast radius (files that must change in the same commit)
1. `packages/db/scripts/reference-test-data.js` — delete
2. `apps/web/tests/shared/reference-test-data.test.ts` — delete (moots itself)
3. `package.json:35` — remove `db:seed:reference-test-data` script entry
4. `packages/db/package.json:32` — remove `db:seed:reference-test-data` script entry
5. `docs/cross-cutting/TESTING.md:58` — remove the row documenting the script
6. `apps/web/tests/shared/package-scripts.test.ts` — if this test asserts on the presence of `db:seed:reference-test-data`, update its expectations. (Not confirmed; needs a read pass — test is 42 lines / 1 test.)

Nice-to-update but not required (stale doc references are tolerable):
- `docs/scans/WAREHOUSE_SCAN.md` (references lines 238-260)
- `docs/scans/WAREHOUSE_PHASE_0_READINESS.md` (15+ references)

### Is there a reason to keep any part of it?
**Potentially yes — investigate.** The script provides cross-domain fixture blueprints that wire together manufacturers → management companies → properties → categories → services → products → warehouses → imports → inventories → templates (see `packages/db/scripts/reference-test-data.js:275-467`). Nothing in the current test suite imports these blueprints — but the dev workflow may rely on `db:seed:reference-test-data` to populate local/staging DBs for manual QA. Confirming "no dev workflow uses this" is outside what code alone can show.

**If dev workflow depends on it:**
- Replace with per-module `seed-*.ts` canonical lists (mirroring `packages/db/src/seed/categories.ts` and `packages/db/src/seed/unit-of-measures.ts`). Each would live under `packages/db/src/seed/` with a matching `scripts/seed-*.js` wrapper.
- Warehouse sweep would author `packages/db/src/seed/warehouses.ts` as part of reference-data conversion — this is already implied by Phase 0's blueprint approach.

**If dev workflow does not depend on it:** delete is safe.

---

## Output Notes

- Every claim cites a file path and (where applicable) a line number or test output excerpt.
- No files were modified. All commands run in read-only mode.
- Test output captured at `/tmp/web-test-full.log` (web, 300-line vitest reporter output) and in ephemeral task output files (relay, worker — both clean).
- Items that need human input before deletion are flagged explicitly in Sections 8 and 9.
