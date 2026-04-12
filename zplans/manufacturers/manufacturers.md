 Manufacturers Module Layer Extraction

 Context

 The manufacturers module (apps/web/modules/manufacturers/) currently has application/, domain/, and data/ directories inline within the module, plus root-level re-export files (services.ts, validators.ts). Per the architecture docs and the admin module reference pattern, business rules belong in packages/domain/, use cases in packages/application/, and persistence in packages/db/. The module itself should only contain components/, controller/, and data/ (server-side query bridges). The record/ subdirectory also needs to be dissolved — its files redistributed into components/record/ and controller/.

 Reference pattern: Mirror packages/application/src/admin/ file-for-file (errors.ts, types.ts, per-use-case files, index.ts barrel) throughout every step below. Do not invent new structure.

 Steps

 Step 1: Extract Domain Layer → packages/domain/src/flooring/manufacturers/

 Current state: No packages/domain/src/flooring/manufacturers/ directory exists yet. All domain logic lives inline in the module.

 Move these files:
 - apps/web/modules/manufacturers/domain/types.ts → packages/domain/src/flooring/manufacturers/types.ts
   - Contains: ManufacturerRow, ManufacturerForm, EMPTY_MANUFACTURER_FORM, toManufacturerForm()
   - Pure types/form helpers — no I/O, fits domain layer rules
 - apps/web/modules/manufacturers/domain/manufacturer-rules.ts → packages/domain/src/flooring/manufacturers/manufacturer-rules.ts
   - Contains: normalizeManufacturerCompanyNameForUniqueness(), isManufacturerCompanyNameConflict(), isManufacturerDeleteBlocked()
   - Pure predicate/computation functions — fits domain layer
 - apps/web/modules/manufacturers/validators.ts → packages/domain/src/flooring/manufacturers/validators.ts
   - Contains: normalizeManufacturerCompanyName(), validateManufacturerForm()
   - Pure validation — no I/O, fits domain layer rules
   - Note: validateManufacturerForm accepts an existingManufacturers array for uniqueness checking — this is pure in-memory comparison, not I/O

 Normalizers (do NOT move to domain):
 - apps/web/modules/manufacturers/services.ts contains normalizeManufacturer() which deals with Prisma result shapes (Date fields, _count, nullable fields). Per the categories pattern, normalizers that touch Prisma shapes belong in packages/db/ (read-repository). Move to Step 2.

 Create barrel export: packages/domain/src/flooring/manufacturers/index.ts exporting from types.js, manufacturer-rules.js, and validators.js.
 Update packages/domain/src/index.ts to add the manufacturers barrel export.

 Admin module reference: Match the barrel pattern from packages/application/src/admin/index.ts — one index.ts re-exporting all submodules.

 Step 2: Extract Data Layer → packages/db/src/flooring/manufacturers/

 Create:
 - packages/db/src/flooring/manufacturers/read-repository.ts
   - Move from apps/web/modules/manufacturers/services.ts: normalizeManufacturer() (normalizer that touches Prisma shapes — matches categories pattern where normalizeCategoryRow is in read-repository.ts)
   - Move from apps/web/modules/manufacturers/data/queries.ts: listManufacturers(), getManufacturerById() (Prisma queries)
   - Move from apps/web/modules/manufacturers/data/server-records.ts: manufacturerCompanyNameExists(), getManufacturerDeleteState() (read queries)
   - All functions accept optional client parameter (matching categories pattern)
   - Export ManufacturerRecord type (the normalized row shape, equivalent to CategoryRecord)
   - Import types from @builders/domain for ManufacturerRow
 - packages/db/src/flooring/manufacturers/write-repository.ts
   - Move from apps/web/modules/manufacturers/data/server-records.ts: createManufacturerPrimaryRecord(), updateManufacturerPrimaryRecord(), deleteManufacturerRecordById()
   - All functions accept optional client parameter
   - Import normalizer from read-repository.js (matching categories pattern)
 - packages/db/src/flooring/manufacturers/index.ts — barrel file

 Update packages/db/src/index.ts to add exports for both repositories.

 Admin module reference: Same barrel-per-subdomain pattern as admin uses in the application layer.

 Step 3: Extract Application Layer → packages/application/src/flooring/manufacturers/

 Mirror packages/application/src/admin/ file-for-file:

 Create:
 - packages/application/src/flooring/manufacturers/errors.ts — ManufacturerExecutionError class
   - Carries: code (string enum), status (HTTP 400–499), field (optional string), payload (optional Record<string, unknown>)
   - Matches GovernanceExecutionError shape from packages/application/src/admin/errors.ts exactly
   - No import from @/server/http/api-helpers or anything under apps/web/
   - Route handlers do not translate it; normalizePrismaError / routeError handle it via the FLO-50 path
 - packages/application/src/flooring/manufacturers/types.ts — application-level DTOs if needed
 - packages/application/src/flooring/manufacturers/create-manufacturer.ts — extracted from manage-manufacturer.ts's createManufacturerRecord()
 - packages/application/src/flooring/manufacturers/update-manufacturer.ts — extracted from manage-manufacturer.ts's replaceManufacturerPrimarySection()
   - Note: manage-manufacturer.ts also exports validateUpdateManufacturerPrimarySectionInput() — this is input parsing/validation that the route handler calls before the use case. Move it into this file or into a shared validation helper within the application layer.
 - packages/application/src/flooring/manufacturers/delete-manufacturer.ts — extracted from manage-manufacturer.ts's deleteManufacturerRecord()
   - Currently may import createAppError from @/server/http/api-helpers — this is a layer violation. Refactor to throw ManufacturerExecutionError with code and status instead.
 - packages/application/src/flooring/manufacturers/index.ts — barrel file re-exporting errors, types, and all use cases

 Update packages/application/src/index.ts to add the manufacturers barrel export.

 Use case inventory (exhaustive):
 - createManufacturer — from manage-manufacturer.ts createManufacturerRecord()
 - updateManufacturer — from manage-manufacturer.ts replaceManufacturerPrimarySection() (+ validateUpdateManufacturerPrimarySectionInput())
 - deleteManufacturer — from manage-manufacturer.ts deleteManufacturerRecord() (includes getManufacturerDeleteState read + domain rule check — multi-step orchestration)
 - All read-side queries in data/queries.ts (listManufacturers, getManufacturerById, getManufacturersPageData, getManufacturerDetailPageData) are single-repo reads and stay as direct @builders/db calls from data/queries.ts (bridge pattern, matching categories). They do NOT become application use cases.

 Step 4: Restructure Module Directory

 Target structure:
 apps/web/modules/manufacturers/
 ├── controller/
 │   ├── use-manufacturers-list-controller.ts    (moved from controllers/)
 │   └── use-manufacturer-primary-section.ts     (moved from record/panel/controllers/)
 ├── components/
 │   ├── list/
 │   │   ├── manufacturers-client.tsx            (stays)
 │   │   └── manufacturers-table.tsx             (stays)
 │   └── record/
 │       ├── manufacturer-create-client.tsx       (moved from record/create/)
 │       ├── manufacturer-detail-client.tsx       (moved from record/detail/)
 │       ├── manufacturer-record-panel.tsx        (moved from record/panel/)
 │       └── manufacturer-primary-fields-section.tsx (moved from record/panel/sections/)
 ├── data/
 │   ├── queries.ts                              (rewritten as bridge to @builders/db)
 │   └── mutations.ts                            (stays — client-side fetch wrappers, update type imports only)

 Remove: application/, domain/, record/, controllers/ (note the plural rename to singular controller/), services.ts (root), validators.ts (root)
 Also remove: data/server-records.ts, data/server-mutations.ts (deprecated — logic moved to packages/db and packages/application)

 Note: components/manufacturers-client.tsx is a re-export of list/manufacturers-client.tsx. Check if dashboard page imports the re-export or the direct path. Update the import in the page to use list/manufacturers-client directly, then delete the re-export.

 Step 4.5: Route Policy Audit

 Before touching imports in Step 5, open all 3 route files and verify each handler uses:

 - applyRoutePolicy (not requireRouteAccess)
 - parseMutationEnvelope for mutations
 - enforceMutationReceipt + finalizeMutationReceipt for POST/PATCH/DELETE
 - enforceQueryRateLimit for GET
 - withMutationTelemetry wrapping use case calls
 - routeJson / routeError for responses
 - assertExpectedUpdatedAt on PATCH/DELETE

 Current state (from scan):
 - POST handler in route.ts: Uses applyRoutePolicy, parseMutationEnvelope, enforceMutationReceipt/finalizeMutationReceipt, withMutationTelemetry, routeJson/routeError. Compliant.
 - GET handler in route.ts: Uses authorizeManufacturersRoute() + enforceQueryRateLimit. Verify authorizeManufacturersRoute delegates to applyRoutePolicy.
 - PATCH handler in [id]/route.ts: Uses applyRoutePolicy, assertExpectedUpdatedAt, parseMutationEnvelope, enforceMutationReceipt/finalizeMutationReceipt, withMutationTelemetry. Compliant.
 - DELETE handler in [id]/route.ts: Uses applyRoutePolicy, assertExpectedUpdatedAt, parseMutationEnvelope, enforceMutationReceipt/finalizeMutationReceipt, withMutationTelemetry. Compliant.
 - PATCH handler in [id]/primary/section/route.ts: Uses applyRoutePolicy, assertExpectedUpdatedAt, parseMutationEnvelope, enforceMutationReceipt/finalizeMutationReceipt, withMutationTelemetry. Compliant.

 Any handler still on route-helpers gets migrated in this sweep. Document the before/after state in a comment block at the top of each route file during migration.

 Step 5: Update All Imports

 Import rules — routes vs components (split):

 Routes (app/api/manufacturers/):
 - Import use cases from @builders/application
 - May import types/schemas from @builders/domain for envelope parsing only
 - Must not import domain predicates or normalizers
 - Must not import from apps/web/modules/manufacturers/domain or apps/web/modules/manufacturers/application

 Components and controllers (modules/manufacturers/components/, modules/manufacturers/controller/):
 - Import types from @builders/domain
 - Must not import from @builders/application or @builders/db
 - Must not import from @/server/http/

 Files that import from the manufacturers module (must be updated):

 API routes (import application use cases + domain types):
 - apps/web/app/api/manufacturers/route.ts — update imports to @builders/application and @builders/domain
 - apps/web/app/api/manufacturers/[id]/route.ts — same
 - apps/web/app/api/manufacturers/[id]/primary/section/route.ts — same

 Dashboard pages (import components + data queries):
 - apps/web/app/dashboard/manufacturers/page.tsx — update component path
 - apps/web/app/dashboard/manufacturers/[id]/page.tsx — update component path (record/ → components/record/)
 - apps/web/app/dashboard/manufacturers/new/page.tsx — update component path

 External module imports (critical — other modules depend on manufacturers):
 - apps/web/modules/products/data/queries.ts — currently imports listManufacturers from @/modules/manufacturers/data/queries. After the move, update to import from @builders/db (not from the module).

 Internal module imports (components importing domain types/controllers):
 - All components/ and controller/ files — update to import from @builders/domain instead of ../domain/types
 - data/queries.ts — rewrite to bridge pattern (import from @builders/db, not from module data layer)
 - data/mutations.ts — update type imports to @builders/domain

 Step 6: Build Packages

 Run npm run build (or equivalent) in packages/domain, packages/application, and packages/db to compile the new files so the barrel exports resolve.

 Step 7: Update Tests (minimal)

 Tests at apps/web/tests/modules/manufacturers/ — update mock paths and import paths to match new locations. Do not write new tests.

 Test files:
 - apps/web/tests/modules/manufacturers/manufacturers.test.ts
 - apps/web/tests/modules/manufacturers/manufacturers-client.test.tsx
 - apps/web/tests/modules/manufacturers/manufacturers-primary-section-route.test.ts

 Critical Files

 ┌────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────┐
 │                               File                                │                                          Action                                          │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/domain/src/flooring/manufacturers/types.ts               │ Create (from module domain/types.ts)                                                     │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/domain/src/flooring/manufacturers/manufacturer-rules.ts  │ Create (from module domain/manufacturer-rules.ts)                                        │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/domain/src/flooring/manufacturers/validators.ts          │ Create (from module validators.ts)                                                       │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/domain/src/flooring/manufacturers/index.ts               │ Create barrel                                                                            │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/domain/src/index.ts                                      │ Update exports                                                                           │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/db/src/flooring/manufacturers/read-repository.ts         │ Create (from module data/queries.ts + services.ts)                                       │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/db/src/flooring/manufacturers/write-repository.ts        │ Create (from module data/server-records.ts)                                              │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/db/src/flooring/manufacturers/index.ts                   │ Create barrel                                                                            │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/db/src/index.ts                                          │ Update exports                                                                           │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/manufacturers/errors.ts         │ Create (mirror admin/errors.ts — ManufacturerExecutionError)                             │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/manufacturers/types.ts          │ Create (mirror admin/types.ts)                                                           │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/manufacturers/create-manufacturer.ts │ Create (from manage-manufacturer.ts createManufacturerRecord)                       │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/manufacturers/update-manufacturer.ts │ Create (from manage-manufacturer.ts replaceManufacturerPrimarySection)              │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/manufacturers/delete-manufacturer.ts │ Create (from manage-manufacturer.ts deleteManufacturerRecord)                       │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/manufacturers/index.ts          │ Create barrel (mirror admin/index.ts)                                                    │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/index.ts                                 │ Update exports                                                                           │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/modules/manufacturers/                                   │ Restructure (delete application/, domain/, record/, controllers/, services.ts,           │
 │                                                                    │ validators.ts, data/server-records.ts, data/server-mutations.ts)                         │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/app/api/manufacturers/route.ts                           │ Audit route policy (Step 4.5) + update imports                                          │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/app/api/manufacturers/[id]/route.ts                      │ Audit route policy (Step 4.5) + update imports                                          │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/app/api/manufacturers/[id]/primary/section/route.ts      │ Audit route policy (Step 4.5) + update imports                                          │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/app/dashboard/manufacturers/*/page.tsx                   │ Update imports                                                                           │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/modules/products/data/queries.ts                         │ Update: import listManufacturers from @builders/db                                       │
 ├────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/tests/modules/manufacturers/*.test.ts(x)                 │ Update mock paths and import paths                                                       │
 └────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────┘

 Differences from Contacts Migration

 1. Manufacturers has 3 API routes (extra [id]/primary/section/route.ts) vs contacts' 2
 2. Manufacturers has root-level re-export files (services.ts, validators.ts) that must be deleted
 3. Manufacturers has a deprecated data/server-mutations.ts file that must be removed
 4. Products module imports listManufacturers from manufacturers — cross-module dependency to update (contacts had shared engine loader)
 5. No pre-existing packages/domain/src/flooring/manufacturers/ directory (contacts already had delete-rules.ts there)
 6. Manufacturers domain has separate manufacturer-rules.ts and validators.ts files (contacts had these combined)
 7. components/manufacturers-client.tsx is a re-export shim that should be removed

 Verification

 1. Run npx tsc --noEmit from apps/web to verify no type errors
 2. Build all three packages: cd packages/domain && npm run build, same for application and db
 3. Run existing manufacturer tests: npx vitest run tests/modules/manufacturers/
 4. Start the dev server and verify:
   - /dashboard/manufacturers list page loads
   - Create a new manufacturer
   - Open a manufacturer detail page
   - Edit and save a manufacturer (primary section)
   - Delete a manufacturer (one without products)
   - Verify /dashboard/products still loads (cross-module dependency)
 5. Grep pass — all must return zero hits:
   ```bash
   # API routes — no legacy imports
   grep -r 'requireRouteAccess' apps/web/app/api/manufacturers/
   grep -r 'route-helpers' apps/web/app/api/manufacturers/
   grep -r 'createAppError' apps/web/app/api/manufacturers/
   grep -r 'apps/web/modules/manufacturers/domain' apps/web/app/api/manufacturers/
   grep -r 'apps/web/modules/manufacturers/application' apps/web/app/api/manufacturers/

   # Module components/controllers — no server imports
   grep -r '@/server/http/' apps/web/modules/manufacturers/

   # Cross-module — no direct module imports from products
   grep -r '@/modules/manufacturers/data' apps/web/modules/products/
   ```
