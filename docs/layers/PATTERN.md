# Layer Pattern

> Authoritative contract for how layers communicate. Dependencies flow one direction: domain → data → application → server → api → controller → ui. Violations are bugs.

## 1. Domain
**Package:** `packages/domain/`

- **Imports:**
  - `zod` (queue message schemas only)
  - Relative paths within `packages/domain/src/`
- **Exports to:**
  - `packages/application/` — predicates (`canDeleteService`, `isWarehouseDeleteBlocked`, etc.), message builders (`buildWarehouseDeleteBlockedMessage`, `getDeleteBlockedMessage`, …), normalizers (`normalizeWarehouseName`), `validateDiff` + `DiffValidationIssue[]` (warehouses sectional diff), `assignDiffIds`, queue schemas, shared utilities (`shared/` formatters and calculators)
  - `apps/web/modules/` (controllers and UI) — `EMPTY_*_FORM` constants and `to*Form` converters (`EMPTY_SERVICE_FORM` / `toServiceForm`, `EMPTY_CONTACT_FORM` / `toContactForm`, `EMPTY_MANUFACTURER_FORM` / `toManufacturerForm`, `EMPTY_WAREHOUSE_FORM` / `EMPTY_LOCATION_FORM` / `toWarehouseForm` / `toLocationForm`), plus shared utilities for display (`formatCurrencyValue`, `sumLineTotals`, `calculateRecordSalesRepExpense`, `normalizeTableFilterValues`)
  - `apps/worker/` — queue message schemas for job payload validation, plus any predicates/rules the use cases it delegates to depend on

## 2. Data
**Package:** `packages/db/`

- **Imports:**
  - `@prisma/client`
  - `@builders/domain` (type shapes only — no rule functions)
  - `packages/lib/` (logging, Redis helpers)
  - Relative paths within `packages/db/src/`
- **Exports to:**
  - `packages/application/` — read/write repository functions, record types, transaction helpers (`withDatabaseTransaction`), outbox writers, mutation receipt functions
  - `apps/web/modules/{name}/data/` — read functions only (via re-export in module `data/queries.ts`)

## 3. Application
**Package:** `packages/application/`

- **Imports:**
  - `@builders/domain` — all predicates, message builders, diff validators
  - `@builders/db` — repositories, transaction helpers, outbox writers
  - `crypto` — UUID generation (injected into `assignDiffIds`)
  - Relative paths within `packages/application/src/`
- **Exports to:**
  - `apps/web/app/api/` — use case functions, `ExecutionError` classes, input types
  - `apps/worker/` — use case functions for job processing
  - `apps/web/modules/{name}/data/` — input types for client-side mutation helpers

## 4. Server
**Path:** `apps/web/server/`

- **Imports:**
  - `next-auth` (auth infrastructure)
  - `@builders/db` — Prisma client for session resolution, mutation receipts
  - `@builders/domain` — capability definitions, role enums
  - `packages/lib/` — structured logging, Redis client
  - `packages/config/` — environment configuration
- **Exports to:**
  - `apps/web/app/api/` — `applyRoutePolicy`, `parseMutationEnvelope`, `enforceMutationReceipt`, `finalizeMutationReceipt`, `withMutationTelemetry`, `routeJson`, `routeError`, `assertExpectedUpdatedAt`, `getClientIp`, `getRequestId`
  - `apps/web/app/dashboard/` — `requireSessionUser`, `getUserToolContext`, tool access helpers
  - `apps/web/app/api/auth/` — NextAuth auth options

## 5. API
**Path:** `apps/web/app/api/`

- **Imports:**
  - `apps/web/server/` — all route policy and mutation lifecycle helpers
  - `@builders/application` — use cases, `ExecutionError` classes, input types
  - `@builders/db` — read repository functions (for GET handlers only)
  - `next/server` — `NextRequest`, `NextResponse` types
  - Route-local `_validators.ts` files
- **Exports to:**
  - HTTP clients (no TypeScript imports — HTTP boundary only)
  - Response shapes consumed by `apps/web/modules/{name}/data/mutations.ts` and server components

## 6. Controller
**Path:** `apps/web/modules/{name}/controller/`

- **Imports:**
  - `apps/web/modules/shared/engines/` — `useListViewEngine`, `useRecordSectionController`, `useConfiguredTableState`, shared controller primitives
  - `apps/web/modules/{name}/data/` — client-side mutation helpers (`createXRequest`, `updateXRequest`, `deleteXRequest`)
  - `@builders/domain` — types, form shapes, `EMPTY_*_FORM`, `to*Form` converters
  - `@builders/application` — input types only (never use case functions)
  - `react`
- **Exports to:**
  - `apps/web/modules/{name}/components/` — controller hook return values

## 7. UI
**Path:** `apps/web/modules/{name}/components/`, `apps/web/app/dashboard/`

- **Imports:**
  - `apps/web/modules/{name}/controller/` — controller hooks
  - `apps/web/modules/shared/engines/` — presentational components (table shell, record section shell, form fields)
  - `apps/web/modules/app-shell/` — navigation, header, dashboard layout
  - `@builders/domain` — type shapes for props
  - `react`, `next/navigation`, `next/link`
- **Exports to:**
  - Next.js runtime (page components, client components)
  - Never imported by other TypeScript code

---

## Violations

### Structural (dependency direction broken)
- **Domain importing from data, application, server, or above.** Domain must remain pure. Importing Prisma types or repository functions collapses the layer boundary and makes domain untestable in isolation.
- **Data importing from application, server, or above.** Data is persistence-only. Importing use cases creates circular dependencies.
- **Application importing from server or above.** Application must be transport-agnostic so workers can consume it. Importing `Request`, `Response`, or Next.js types couples use cases to HTTP.
- **Server importing from api, controller, or ui.** Server is infrastructure. Routes consume server helpers, not the reverse.
- **Controller importing from `@builders/db`.** Controllers are client-side; importing from data pulls Prisma into the browser bundle.
- **UI importing from controller siblings.** UI components consume only their own module's controller, never another module's.
- **UI importing from `@builders/db` or `@builders/application`.** UI is presentational; business logic and persistence must flow through the controller.

### Boundary (correct layer, wrong content)
- **Domain importing `zod` for anything beyond queue schemas.** Validation at the domain level is pure TypeScript predicates, not schema parsing.
- **Data importing domain rule functions.** Data may import type shapes from domain, never predicates or message builders. Rules belong in the application call path.
- **Application importing Prisma types directly (`Prisma.TransactionClient` excepted).** Use cases accept the transaction client but should not type function signatures with Prisma model types. Use domain or db-layer record types instead.
- **Server importing use cases from `@builders/application`.** Server is infrastructure; use cases are invoked by routes, not by server helpers.
- **API importing write repositories directly.** GET handlers may import read repos; mutations must flow through application use cases.
- **Controller importing use case functions.** Controllers call the API via mutation helpers in `data/mutations.ts`. They never invoke use cases directly.
- **UI importing mutation helpers.** UI components never call the API. All mutations flow through controller actions.

### Responsibility (correct imports, misplaced logic)
- **Business rules in application.** Predicates like "is delete blocked" or "does name conflict" belong in domain. Application orchestrates; it does not decide.
- **Transaction boundaries in data.** `withDatabaseTransaction` is called by application use cases. Repositories accept the client; they do not open transactions.
- **Outbox writes outside the mutation transaction.** The outbox event must be written in the same `withDatabaseTransaction` as the state mutation. Writing it in a separate transaction breaks delivery guarantees.
- **UUID generation in domain.** Identity is generated by application and passed to domain functions that need it (e.g., `assignDiffIds` receives `crypto.randomUUID` as a parameter).
- **Error throwing in domain.** Domain returns violation information (boolean, string, issue array). Application translates that output into thrown `ExecutionError`.
- **HTTP status codes in application.** `ExecutionError` carries a `status` field, but the decision to map domain violations to specific HTTP codes belongs to the error class definition, not to the use case logic.
- **Data fetching in UI.** All fetches flow through controllers or server components. UI components receive props and controller state.
- **Business validation in controllers.** Input validation is a route-layer concern (`_validators.ts`). Controllers handle UI state and dirty tracking.
