 Services Module Layer Extraction

 Context

 The services module (apps/web/modules/services/) currently has application/, domain/, and data/ directories inline within the module, plus a root-level re-export file (services.ts). Per the architecture docs and the admin module reference pattern, business rules belong in packages/domain/, use cases in packages/application/, and persistence in packages/db/. The module itself should only contain components/, controller/, and data/ (server-side query bridges). The record/ subdirectory also needs to be dissolved — its files redistributed into components/record/ and controller/.

 Reference pattern: Mirror packages/application/src/admin/ file-for-file (errors.ts, types.ts, per-use-case files, index.ts barrel) throughout every step below. Do not invent new structure.

 Current State Summary

 Inline files that violate layer boundaries:
 - modules/services/application/manage-service.ts — use case orchestration (imports createAppError from @/server/http/api-helpers — layer violation)
 - modules/services/domain/types.ts — pure types, form helpers, validation
 - modules/services/domain/services.ts — re-export shim to ../services.ts
 - modules/services/services.ts — normalizers (normalizeServiceRow, normalizeServiceOption) that touch Prisma shapes
 - modules/services/data/server-records.ts — write repository + delete state query (direct Prisma calls)
 - modules/services/data/mutations.ts — dead code: client-side fetch wrappers with no imports, missing withMutationMeta

 Pre-existing package code:
 - packages/domain/src/flooring/services/delete-rules.ts — already extracted (isServiceDeleteBlocked, getServiceDeleteBlockedMessage)
 - No packages/db/src/flooring/services/ directory
 - No packages/application/src/flooring/services/ directory

 Steps

 Step 1: Extract Domain Layer → packages/domain/src/flooring/services/

 Current state: packages/domain/src/flooring/services/ already has delete-rules.ts.

 Move these files:
 - apps/web/modules/services/domain/types.ts → packages/domain/src/flooring/services/types.ts
   - Contains: ServiceRow, ServiceForm, UnitOption, EMPTY_SERVICE_FORM, validateServiceForm(), toServiceForm()
   - Pure types/form helpers — no I/O, fits domain layer rules

 Normalizers (do NOT move to domain):
 - apps/web/modules/services/services.ts contains normalizeServiceRow() and normalizeServiceOption() which deal with Prisma result shapes (Date fields, _count, Decimal.toString()). Per the categories pattern, normalizers that touch Prisma shapes belong in packages/db/ (read-repository). Move to Step 2.

 Create barrel export: packages/domain/src/flooring/services/index.ts exporting from delete-rules.js and types.js.
 Update packages/domain/src/index.ts to replace the direct delete-rules.js export with ./flooring/services/index.js.

 Step 2: Extract Data Layer → packages/db/src/flooring/services/

 Create:
 - packages/db/src/flooring/services/read-repository.ts
   - Move from apps/web/modules/services/services.ts: normalizeServiceRow(), normalizeServiceOption() (normalizers that touch Prisma shapes)
   - Move from apps/web/modules/services/data/queries.ts: loadServices() (as listServices), getServiceById(), listServiceOptions(), loadUnitOptions() (as listUnitOptions)
   - Move from apps/web/modules/services/data/server-records.ts: getServiceDeleteState()
   - All functions accept optional client parameter (matching categories/contacts/manufacturers pattern)
   - Export ServiceRecord type (the normalized row shape)
   - Export ServiceDeleteStateResult type
 - packages/db/src/flooring/services/write-repository.ts
   - Move from apps/web/modules/services/data/server-records.ts: createServiceRecord(), updateServiceRecord(), deleteServiceRecordById()
   - All functions accept optional client parameter
   - Import normalizer from read-repository.js
   - Normalize return values through normalizeServiceRow (currently createServiceRecord returns raw Prisma — align with contacts/manufacturers pattern where write functions normalize)
 - packages/db/src/flooring/services/index.ts — barrel file

 Update packages/db/src/index.ts to add exports for both repositories.

 Step 3: Extract Application Layer → packages/application/src/flooring/services/

 Mirror packages/application/src/admin/ file-for-file:

 Create:
 - packages/application/src/flooring/services/errors.ts — ServiceExecutionError class
   - Carries: code (string enum), status (HTTP 400–499), field (optional string), payload (optional Record<string, unknown>)
   - Matches GovernanceExecutionError / ManufacturerExecutionError / ContactExecutionError shape exactly
   - No import from @/server/http/api-helpers or anything under apps/web/
 - packages/application/src/flooring/services/types.ts — application-level DTOs
   - ServiceInput type: { name: string, unitId: string, baseCost: string | number, notes: string | null }
   - ServiceResult type alias for ServiceRecord from @builders/db
 - packages/application/src/flooring/services/create-service.ts — extracted from manage-service.ts createServiceEntry()
   - Calls createServiceRecord(input), then getServiceById(created.id) to return normalized row
 - packages/application/src/flooring/services/update-service.ts — extracted from manage-service.ts updateServiceEntry()
   - Calls updateServiceRecord(id, input), then getServiceById(id) to return normalized row
 - packages/application/src/flooring/services/delete-service.ts — extracted from manage-service.ts deleteServiceEntry()
   - Currently imports createAppError from @/server/http/api-helpers — this is a layer violation
   - Refactor to throw ServiceExecutionError with code "SERVICE_NOT_FOUND" (404) and "SERVICE_IN_USE" (409) instead
   - Uses getServiceDeleteState + isServiceDeleteBlocked from @builders/domain
   - Calls deleteServiceRecordById
 - packages/application/src/flooring/services/index.ts — barrel file re-exporting errors, types, and all use cases

 Update packages/application/src/index.ts to add the services barrel export.

 Use case inventory (exhaustive):
 - createServiceUseCase — from manage-service.ts createServiceEntry()
 - updateServiceUseCase — from manage-service.ts updateServiceEntry()
 - deleteServiceUseCase — from manage-service.ts deleteServiceEntry() (includes getServiceDeleteState read + domain rule check — multi-step orchestration)
 - All read-side queries (listServices, listServiceOptions, getServiceById, getServicesPageData, getServiceDetailPageData, getServiceCreatePageData) are single-repo reads and stay as direct @builders/db calls from data/queries.ts (bridge pattern). They do NOT become application use cases.

 Step 4: Restructure Module Directory

 Target structure:
 apps/web/modules/services/
 ├── controller/
 │   ├── use-services-list-controller.ts    (moved from controllers/)
 │   └── use-service-primary-section.ts     (moved from record/panel/controllers/)
 ├── components/
 │   ├── list/
 │   │   ├── services-client.tsx            (stays)
 │   │   └── services-table.tsx             (stays)
 │   └── record/
 │       ├── service-create-client.tsx       (moved from record/create/)
 │       ├── service-detail-client.tsx       (moved from record/detail/)
 │       ├── service-record-panel.tsx        (moved from record/panel/)
 │       └── service-primary-fields-section.tsx (moved from record/panel/sections/)
 ├── data/
 │   ├── queries.ts                         (rewritten as bridge to @builders/db)
 │   └── mutations.ts                       (stays — fix withMutationMeta wrapping, update type imports)

 Remove: application/, domain/, record/, controllers/ (note the plural rename to singular controller/), services.ts (root), data/server-records.ts

 Note: components/services-client.tsx is a re-export of list/services-client.tsx. Check if dashboard page imports the re-export or the direct path. Current state: page.tsx imports list/services-client directly. Delete the re-export.

 Also note: domain/services.ts is itself a re-export shim (`export * from "../services"`) — delete both.

 Step 4.5: Route Policy Audit

 Before touching imports in Step 5, open both route files and verify each handler uses:

 - applyRoutePolicy (not requireRouteAccess)
 - parseMutationEnvelope for mutations
 - enforceMutationReceipt + finalizeMutationReceipt for POST/PATCH/DELETE
 - enforceQueryRateLimit for GET
 - withMutationTelemetry wrapping use case calls
 - routeJson / routeError for responses
 - assertExpectedUpdatedAt on PATCH/DELETE

 Current state (from scan):
 - POST handler in route.ts: Uses applyRoutePolicy, parseMutationEnvelope, enforceMutationReceipt/finalizeMutationReceipt, withMutationTelemetry, routeJson/routeError. Compliant.
 - GET handler in route.ts: Uses authorizeServicesRoute() + enforceQueryRateLimit. Verify authorizeServicesRoute delegates to applyRoutePolicy — if it uses requireRouteAccess, migrate it.
 - PATCH handler in [id]/route.ts: Uses applyRoutePolicy, assertExpectedUpdatedAt, parseMutationEnvelope, enforceMutationReceipt/finalizeMutationReceipt, withMutationTelemetry. Compliant.
 - DELETE handler in [id]/route.ts: Uses applyRoutePolicy, assertExpectedUpdatedAt, parseMutationEnvelope, enforceMutationReceipt/finalizeMutationReceipt, withMutationTelemetry. Compliant.

 Any handler still on requireRouteAccess gets migrated in this sweep.

 Step 4.75: Fix Client-Side Mutation Envelope

 The data/mutations.ts file has the same bug found in manufacturers and contacts — sends raw JSON.stringify(input) without wrapping in withMutationMeta. Additionally, the create client and detail controller do inline requestJson calls instead of using mutations.ts.

 Fix:
 - data/mutations.ts: Import withMutationMeta, wrap all payloads. Update signatures: updateServiceRequest(id, input, revisionKey), deleteServiceRequest(id, updatedAt).
 - components/record/service-create-client.tsx: Import and call createServiceRequest from data/mutations instead of inline requestJson.
 - controller/use-service-primary-section.ts: Import and call updateServiceRequest + deleteServiceRequest from data/mutations instead of inline requestJson. Destructure revisionKey in saveSection.

 Step 5: Update All Imports

 Import rules — routes vs components (split):

 Routes (app/api/services/):
 - Import use cases from @builders/application (createServiceUseCase, updateServiceUseCase, deleteServiceUseCase)
 - Import read queries from @/modules/services/data/queries (getServiceById for snapshot reads)
 - Must not import from apps/web/modules/services/domain or apps/web/modules/services/application

 Components and controllers (modules/services/components/, modules/services/controller/):
 - Import types from @builders/domain
 - Must not import from @builders/application or @builders/db
 - Must not import from @/server/http/

 Files that import from the services module (must be updated):

 API routes (import application use cases):
 - apps/web/app/api/services/route.ts — update: createServiceEntry → createServiceUseCase from @builders/application, listServices from @/modules/services/data/queries (stays)
 - apps/web/app/api/services/[id]/route.ts — update: updateServiceEntry/deleteServiceEntry → from @builders/application, getServiceById stays from data/queries

 Dashboard pages (import components + data queries):
 - apps/web/app/dashboard/services/page.tsx — already imports from list/services-client directly. No change needed.
 - apps/web/app/dashboard/services/[id]/page.tsx — update: record/detail/service-detail-client → components/record/service-detail-client
 - apps/web/app/dashboard/services/new/page.tsx — update: record/create/service-create-client → components/record/service-create-client

 Cross-module imports (critical — shared engine depends on services):
 - apps/web/modules/shared/engines/common/transport/record-detail-options-loader.ts — currently imports listServiceOptions from @/modules/services/data/queries. After the move, update to import from @builders/db (not from the module).

 Internal module imports (components importing domain types/controllers):
 - All components/ and controller/ files — update to import from @builders/domain instead of ../../domain/types or ../../../domain/types
 - data/queries.ts — rewrite to bridge pattern (import from @builders/db, not from module data layer)
 - data/mutations.ts — update type imports to @builders/domain

 Step 6: Build Packages

 Run npm run build (or equivalent) in packages/domain, packages/application, and packages/db to compile the new files so the barrel exports resolve.

 Step 7: Update Tests (minimal)

 Tests at apps/web/tests/modules/services/ — update mock paths and import paths to match new locations. Do not write new tests.

 Test files:
 - apps/web/tests/modules/services/services-application.test.ts — imports from @/modules/services/application/manage-service → @builders/application
 - apps/web/tests/modules/services/services-client.test.tsx — imports from components/services-client (re-export) and record/detail → update to new paths
 - apps/web/tests/modules/services/services-routes.test.ts — update mock paths

 Critical Files

 ┌────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────┐
 │                               File                                │                                          Action                                          │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/domain/src/flooring/services/types.ts                    │ Create (from module domain/types.ts)                                                     │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/domain/src/flooring/services/index.ts                    │ Create barrel (consolidate existing delete-rules.js + new types.js)                      │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/domain/src/index.ts                                      │ Update exports (replace direct delete-rules.js with ./flooring/services/index.js)        │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/db/src/flooring/services/read-repository.ts              │ Create (from module services.ts normalizers + data/queries.ts reads + server-records.ts)  │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/db/src/flooring/services/write-repository.ts             │ Create (from module data/server-records.ts writes)                                       │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/db/src/flooring/services/index.ts                        │ Create barrel                                                                            │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/db/src/index.ts                                          │ Update exports                                                                           │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/services/errors.ts              │ Create (mirror admin/errors.ts — ServiceExecutionError)                                  │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/services/types.ts               │ Create (mirror admin/types.ts)                                                           │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/services/create-service.ts      │ Create (from manage-service.ts createServiceEntry)                                       │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/services/update-service.ts      │ Create (from manage-service.ts updateServiceEntry)                                       │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/services/delete-service.ts      │ Create (from manage-service.ts deleteServiceEntry — fix createAppError layer violation)  │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/services/index.ts               │ Create barrel (mirror admin/index.ts)                                                    │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/index.ts                                 │ Update exports                                                                           │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/modules/services/                                        │ Restructure (delete application/, domain/, record/, controllers/, services.ts,            │
 │                                                                    │ data/server-records.ts; rename controllers/ → controller/)                               │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/modules/services/components/services-client.tsx          │ Delete (re-export shim — page already imports list/services-client directly)              │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/modules/services/data/mutations.ts                       │ Fix: add withMutationMeta wrapping, update type imports to @builders/domain              │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/app/api/services/route.ts                                │ Audit route policy (Step 4.5) + update imports to @builders/application                  │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/app/api/services/[id]/route.ts                           │ Audit route policy (Step 4.5) + update imports to @builders/application                  │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/app/dashboard/services/[id]/page.tsx                     │ Update import: record/detail/ → components/record/                                       │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/app/dashboard/services/new/page.tsx                      │ Update import: record/create/ → components/record/                                       │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ shared/engines/common/transport/record-detail-options-loader.ts   │ Update: import listServiceOptions from @builders/db                                      │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/tests/modules/services/*.test.ts(x)                      │ Update mock paths and import paths                                                       │
 └────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────┘

 Differences from Manufacturers/Contacts Migration

 1. Services has only 2 API routes (no [id]/primary/section/route.ts) — matches contacts, simpler than manufacturers
 2. Services has a root-level services.ts with normalizers (not just a re-export) + domain/services.ts is a re-export shim to it — both must be deleted after extracting normalizers to packages/db
 3. Services has a UnitOption type and loadUnitOptions() — extra reference data query that moves to read-repository
 4. Services has a listServiceOptions() function used by the shared engine (record-detail-options-loader) — cross-module dependency to update (similar to products importing listManufacturers)
 5. Services has components/services-client.tsx as a re-export shim — must be deleted (test file imports it)
 6. delete-rules.ts already exists in packages/domain — only types.ts needs to be added
 7. manage-service.ts uses createAppError (layer violation) — must be replaced with ServiceExecutionError
 8. data/mutations.ts has same withMutationMeta bug as manufacturers/contacts — fix in Step 4.75
 9. Controllers plural (controllers/) needs rename to singular (controller/) — same as manufacturers/contacts

 Verification

 1. Run npx tsc --noEmit from apps/web to verify no type errors
 2. Build all three packages: cd packages/domain && npm run build, same for application and db
 3. Run existing service tests: npx vitest run tests/modules/services/
 4. Start the dev server and verify:
   - /dashboard/services list page loads
   - Create a new service (requires selecting a unit option)
   - Open a service detail page
   - Edit and save a service
   - Delete a service (one without template/work order links)
 5. Grep pass — all must return zero hits:
   ```bash
   # API routes — no legacy imports
   grep -r 'requireRouteAccess' apps/web/app/api/services/
   grep -r 'createAppError' apps/web/app/api/services/
   grep -r 'modules/services/application' apps/web/app/api/services/

   # Module — no inline domain/application/server imports
   grep -r 'modules/services/domain' apps/web/modules/services/components/
   grep -r 'modules/services/domain' apps/web/modules/services/controller/
   grep -r '@/server/http/' apps/web/modules/services/

   # Cross-module — no direct module imports from shared engine
   grep -r '@/modules/services/data' apps/web/modules/shared/
   ```
