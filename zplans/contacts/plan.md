 Contacts Module Layer Extraction                                                                                                                                                                                                                              
                                                                                 
 Context

 The contacts module (apps/web/modules/contacts/) currently has application/, domain/, and data/ directories inline within the module. Per the architecture docs and the admin module reference pattern, business rules belong in packages/domain/, use cases in packages/application/, and persistence in packages/db/. The module itself should only contain components/, controller/, and data/ (server-side query bridges). The record/ subdirectory also needs to be dissolved — its files redistributed into
 components/record/ and controller/.

 Reference pattern: Mirror packages/application/src/admin/ file-for-file (errors.ts, types.ts, per-use-case files, index.ts barrel) throughout every step below. Do not invent new structure.

 Steps

 Step 1: Extract Domain Layer → packages/domain/src/flooring/contacts/

 Current state: packages/domain/src/flooring/contacts/ already has delete-rules.ts and is exported in the barrel file.

 Move these files:
 - apps/web/modules/contacts/domain/types.ts → packages/domain/src/flooring/contacts/types.ts
   - Contains: ContactType, ContactRow, ContactDetail, ContactForm, CONTACT_TYPE_OPTIONS, CONTACT_TYPE_LABELS, EMPTY_CONTACT_FORM, validateContactType, validateContactForm, toContactForm
   - These are pure types/validation — no I/O, fits domain layer rules
 - apps/web/modules/contacts/domain/services.ts → packages/domain/src/flooring/contacts/services.ts
   - Contains: getContactTypeLabel, normalizeContactRow, normalizeContactDetail
   - Pure computation functions — fits domain layer
   - Note: normalizeContactRow accepts a Prisma-shaped object with Date fields and _count. This is a mild layer violation (domain shouldn't know Prisma shapes) but matches existing patterns (categories normalizeCategoryRow lives in packages/db/).
 Decision: Move normalizers to the db layer (read-repository) instead, matching the categories pattern.

 Updated plan for normalizers:
 - services.ts normalizer functions (normalizeContactRow, normalizeContactDetail, getContactTypeLabel) → move to packages/db/src/flooring/contacts/read-repository.ts since they deal with Prisma result shapes (matches categories pattern where normalizeCategoryRow is in read-repository.ts)
 - Only pure domain logic (types.ts) goes to packages/domain/

 Add barrel export: Create packages/domain/src/flooring/contacts/index.ts exporting from delete-rules.js and types.js. Update packages/domain/src/index.ts to replace the direct delete-rules.js export with ./flooring/contacts/index.js.

 Admin module reference: Match the barrel pattern from packages/application/src/admin/index.ts — one index.ts re-exporting all submodules.

 Step 2: Extract Data Layer → packages/db/src/flooring/contacts/

 Create:
 - packages/db/src/flooring/contacts/read-repository.ts
   - Move from apps/web/modules/contacts/data/queries.ts: the Prisma queries (listContacts, listSalesRepContactOptions, getContactById, getCategoryDeleteState equivalent for contacts)
   - Move from apps/web/modules/contacts/domain/services.ts: normalizeContactRow, normalizeContactDetail, getContactTypeLabel (normalizers that touch Prisma shapes)
   - Move from apps/web/modules/contacts/data/server-records.ts: getContactDeleteState (read query)
   - All functions accept optional client parameter (matching categories pattern)
   - Export ContactRecord type (the normalized row shape, equivalent to CategoryRecord)
   - Import types from @builders/domain for ContactType
 - packages/db/src/flooring/contacts/write-repository.ts
   - Move from apps/web/modules/contacts/data/server-records.ts: createContactRecord, updateContactRecord, deleteContactRecordById
   - All functions accept optional client parameter
   - Import normalizer from read-repository.js (matching categories pattern)
 - packages/db/src/flooring/contacts/index.ts — barrel file

 Update packages/db/src/index.ts to add exports for both repositories.

 Admin module reference: Same barrel-per-subdomain pattern as admin uses in the application layer.

 Step 3: Extract Application Layer → packages/application/src/flooring/contacts/

 Mirror packages/application/src/admin/ file-for-file:

 Create:
 - packages/application/src/flooring/contacts/errors.ts — ContactExecutionError class
   - Carries: code (string enum), status (HTTP 400–499), field (optional string), payload (optional Record<string, unknown>)
   - Matches GovernanceExecutionError shape from packages/application/src/admin/errors.ts exactly
   - No import from @/server/http/api-helpers or anything under apps/web/
   - Route handlers do not translate it; normalizePrismaError / routeError handle it via the FLO-50 path
 - packages/application/src/flooring/contacts/types.ts — application-level DTOs if needed
 - packages/application/src/flooring/contacts/create-contact.ts — extracted from manage-contact.ts's createContactEntry
 - packages/application/src/flooring/contacts/update-contact.ts — extracted from manage-contact.ts's updateContactEntry
 - packages/application/src/flooring/contacts/delete-contact.ts — extracted from manage-contact.ts's deleteContactEntry
   - Currently imports createAppError from @/server/http/api-helpers — this is a layer violation. Refactor to throw ContactExecutionError with code and status instead.
 - packages/application/src/flooring/contacts/index.ts — barrel file re-exporting errors, types, and all use cases

 Update packages/application/src/index.ts to add the contacts barrel export.

 Use case inventory (exhaustive):
 - createContact — from manage-contact.ts createContactEntry
 - updateContact — from manage-contact.ts updateContactEntry
 - deleteContact — from manage-contact.ts deleteContactEntry (includes getContactDeleteState read + domain rule check — multi-step orchestration)
 - All read-side queries in data/queries.ts (listContacts, listSalesRepContactOptions, getContactById, getContactsPageData, getContactDetailPageData) are single-repo reads and stay as direct @builders/db calls from data/queries.ts (bridge pattern, matching categories). They do NOT become application use cases.

 Step 4: Restructure Module Directory

 Target structure:
 apps/web/modules/contacts/
 ├── controller/
 │   ├── use-contacts-list-controller.ts    (moved from controllers/)
 │   └── use-contact-primary-controller.ts  (moved from record/panel/controllers/)
 ├── components/
 │   ├── list/
 │   │   ├── contacts-client.tsx            (stays)
 │   │   └── contacts-table.tsx             (stays)
 │   └── record/
 │       ├── contact-create-client.tsx       (moved from record/create/)
 │       ├── contact-detail-client.tsx       (moved from record/detail/)
 │       ├── contact-record-panel.tsx        (moved from record/panel/)
 │       └── contact-primary-fields-section.tsx (moved from record/panel/sections/)
 ├── data/
 │   └── queries.ts                         (rewritten as bridge to @builders/db)

 Remove: application/, domain/, record/, controllers/ (note the plural rename to singular controller/)

 Step 4.5: Route Policy Audit

 Before touching imports in Step 5, open app/api/contacts/route.ts and app/api/contacts/[id]/route.ts and verify each handler uses:

 - applyRoutePolicy (not requireRouteAccess)
 - parseMutationEnvelope for mutations
 - enforceMutationReceipt + finalizeMutationReceipt for POST/PATCH/DELETE
 - enforceQueryRateLimit for GET
 - withMutationTelemetry wrapping use case calls
 - routeJson / routeError for responses
 - assertExpectedUpdatedAt on PATCH/DELETE

 Current state (from scan):
 - POST handler in route.ts: Already uses applyRoutePolicy, parseMutationEnvelope, enforceMutationReceipt/finalizeMutationReceipt, withMutationTelemetry, routeJson/routeError. Compliant.
 - GET handler in route.ts: Uses authorizeContactsRoute() + enforceQueryRateLimit. Verify authorizeContactsRoute delegates to applyRoutePolicy.
 - PATCH handler in [id]/route.ts: Uses mutation policy, assertExpectedUpdatedAt, enforceMutationReceipt/finalizeMutationReceipt. Compliant.
 - DELETE handler in [id]/route.ts: Uses mutation policy, assertExpectedUpdatedAt, enforceMutationReceipt/finalizeMutationReceipt. Compliant.

 Any handler still on route-helpers gets migrated in this sweep. Document the before/after state in a comment block at the top of each route file during migration.

 Step 5: Update All Imports

 Import rules — routes vs components (split):

 Routes (app/api/contacts/):
 - Import use cases from @builders/application
 - May import types/schemas from @builders/domain for envelope parsing only
 - Must not import domain predicates or normalizers
 - Must not import from apps/web/modules/contacts/domain or apps/web/modules/contacts/application

 Components and controllers (modules/contacts/components/, modules/contacts/controller/):
 - Import types from @builders/domain
 - Must not import from @builders/application or @builders/db
 - Must not import from @/server/http/

 Files that import from the contacts module (must be updated):

 API routes (import application use cases + domain types):
 - apps/web/app/api/contacts/route.ts — update imports to @builders/application and @builders/domain
 - apps/web/app/api/contacts/[id]/route.ts — same

 Dashboard pages (import components + data queries):
 - apps/web/app/dashboard/contacts/page.tsx — update component path
 - apps/web/app/dashboard/contacts/[id]/page.tsx — update component path (record/ → components/record/)
 - apps/web/app/dashboard/contacts/new/page.tsx — update component path

 Shared engine:
 - apps/web/modules/shared/engines/common/transport/record-detail-options-loader.ts — currently imports listSalesRepContactOptions from @/modules/contacts/data/queries. After the move, update to import from @builders/db (not from the module).

 Internal module imports (components importing domain types/controllers):
 - All components/ and controller/ files — update to import from @builders/domain instead of ../domain/types
 - data/queries.ts — rewrite to bridge pattern (import from @builders/db, not from module data layer)
 - data/mutations.ts — update type imports to @builders/domain

 Step 6: Build Packages

 Run npm run build (or equivalent) in packages/domain, packages/application, and packages/db to compile the new files so the barrel exports resolve.

 Step 7: Update Tests (minimal)

 Tests at apps/web/tests/modules/contacts/ — update mock paths and import paths to match new locations. Do not write new tests.

 Critical Files

 ┌──────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────┐
 │                             File                             │                                         Action                                         │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/domain/src/flooring/contacts/types.ts               │ Create (from module domain/types.ts)                                                   │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/domain/src/flooring/contacts/index.ts               │ Create barrel                                                                          │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/domain/src/index.ts                                 │ Update exports                                                                         │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/db/src/flooring/contacts/read-repository.ts         │ Create (from module data/queries.ts + domain/services.ts)                              │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/db/src/flooring/contacts/write-repository.ts        │ Create (from module data/server-records.ts)                                            │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/db/src/flooring/contacts/index.ts                   │ Create barrel                                                                          │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/db/src/index.ts                                     │ Update exports                                                                         │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/contacts/errors.ts         │ Create (mirror admin/errors.ts — ContactExecutionError)                                │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/contacts/types.ts          │ Create (mirror admin/types.ts)                                                         │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/contacts/create-contact.ts │ Create (mirror admin/create-managed-user.ts)                                           │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/contacts/update-contact.ts │ Create (mirror admin/update-managed-user.ts)                                           │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/contacts/delete-contact.ts │ Create (mirror admin/delete-managed-user.ts)                                           │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/flooring/contacts/index.ts          │ Create barrel (mirror admin/index.ts)                                                  │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ packages/application/src/index.ts                            │ Update exports                                                                         │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/modules/contacts/                                   │ Restructure (delete application/, domain/, record/; rename controllers/ → controller/) │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/app/api/contacts/route.ts                           │ Audit route policy (Step 4.5) + update imports                                        │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/app/api/contacts/[id]/route.ts                      │ Audit route policy (Step 4.5) + update imports                                        │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ apps/web/app/dashboard/contacts/*/page.tsx                   │ Update imports                                                                         │
 ├──────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┤
 │ shared/engines/common/transport/record-detail-options-loader │ Update: import listSalesRepContactOptions from @builders/db                            │
 └──────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────┘

 Verification

 1. Run npx tsc --noEmit from apps/web to verify no type errors
 2. Build all three packages: cd packages/domain && npm run build, same for application and db
 3. Run existing contact tests: npx vitest run tests/modules/contacts/
 4. Start the dev server and verify:
   - /dashboard/contacts list page loads
   - Create a new contact
   - Open a contact detail page
   - Edit and save a contact
   - Delete a contact (one without assignments)
 5. Grep pass — all must return zero hits:
   ```bash
   # API routes — no legacy imports
   grep -r 'requireRouteAccess' apps/web/app/api/contacts/
   grep -r 'route-helpers' apps/web/app/api/contacts/
   grep -r 'createAppError' apps/web/app/api/contacts/
   grep -r 'apps/web/modules/contacts/domain' apps/web/app/api/contacts/
   grep -r 'apps/web/modules/contacts/application' apps/web/app/api/contacts/

   # Module components/controllers — no server imports
   grep -r '@/server/http/' apps/web/modules/contacts/
   ```
