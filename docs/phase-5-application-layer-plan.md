# Phase 5 — Application layer: Management Companies, Properties, Job Types

## Context

Phases 1–4 locked down schema, domain, and data. Phase 5 introduces use cases for three modules: management-companies, properties, job-types. Templates + work-orders application-layer work is deferred.

**Placement note:** for this sweep's management-group convention, application files live under `packages/application/src/management/<module>/` (not `packages/application/src/flooring/<module>/`). Mirrors the Phase 2–4 convention for domain + data.

Layer contracts (re-affirmed):
- Use cases orchestrate domain + data. Called by API routes. Open their own `withDatabaseTransaction`.
- Use cases import domain rules and call data repositories. **Never import each other, never import routes / modules / `apps/**`.**
- Domain owns error message strings. Use cases throw module-scoped execution errors with `code` + `status` + the domain-supplied `message`.
- Route-level concerns (auth, rate limit, idempotency, optimistic locks) are not use-case scope.

## Decisions (resolved)

1. **Property name uniqueness — skip.** No schema change, no app-layer check. `PropertyExecutionError` does not carry a `NAME_CONFLICT` code. Duplicate property names are allowed.
2. **Property name scope — n/a** (skipped per decision 1).
3. **Job-type delete blocker — block on both work orders AND templates.** `JobTypeDeleteLinkState` carries both counts; `isJobTypeDeleteBlocked` returns true if either > 0.

## Structure

```
packages/application/src/management/
├── management-companies/
│   ├── errors.ts                          ManagementCompanyExecutionError + code union
│   ├── types.ts                           ManagementCompanyInput, ManagementCompanyResult (re-exports)
│   ├── create-management-company.ts       createManagementCompanyUseCase
│   ├── update-management-company.ts       updateManagementCompanyUseCase
│   ├── delete-management-company.ts       deleteManagementCompanyUseCase
│   └── index.ts
├── properties/
│   ├── errors.ts                          PropertyExecutionError + code union
│   ├── types.ts                           PropertyInput, PropertyResult
│   ├── create-property.ts
│   ├── update-property.ts
│   ├── delete-property.ts
│   └── index.ts
└── job-types/
    ├── errors.ts                          JobTypeExecutionError + code union
    ├── types.ts                           JobTypeInput, JobTypeResult
    ├── create-job-type.ts
    ├── update-job-type.ts
    ├── delete-job-type.ts
    └── index.ts
```

Wire each module's barrel into `packages/application/src/index.ts`.

## Domain additions — error-message strings centralized

Per the rule "domain owns error strings", add one file per module that exports message constants/helpers. Use cases import these and pass them to the execution-error constructor. No inline string literals in use cases.

### `packages/domain/src/management/management-companies/error-messages.ts` (new)

```ts
export const MANAGEMENT_COMPANY_NAME_REQUIRED_MESSAGE = "Management company name is required"
export const MANAGEMENT_COMPANY_NAME_CONFLICT_MESSAGE = "Management company name must be unique"
export const MANAGEMENT_COMPANY_NOT_FOUND_MESSAGE = "Management company not found"
// getManagementCompanyDeleteBlockedMessage already exists in delete-rules.ts — reused, not duplicated.
```

### `packages/domain/src/management/properties/error-messages.ts` (new)

```ts
export const PROPERTY_NAME_REQUIRED_MESSAGE = "Property name is required"
export const PROPERTY_NOT_FOUND_MESSAGE = "Property not found"
// No NAME_CONFLICT — property name is not unique.
```

### `packages/domain/src/management/job-types/error-messages.ts` (new)

```ts
export const JOB_TYPE_NAME_REQUIRED_MESSAGE = "Job type name is required"
export const JOB_TYPE_NAME_CONFLICT_MESSAGE = "Job type name must be unique"
export const JOB_TYPE_NOT_FOUND_MESSAGE = "Job type not found"
```

### `packages/domain/src/management/job-types/delete-rules.ts` (new)

```ts
export type JobTypeDeleteLinkState = {
  workOrderCount: number
  templateCount: number
}

export function isJobTypeDeleteBlocked(state: JobTypeDeleteLinkState) {
  return state.workOrderCount > 0 || state.templateCount > 0
}

export function getJobTypeDeleteBlockedMessage(state: JobTypeDeleteLinkState) {
  if (state.workOrderCount > 0 && state.templateCount > 0) {
    return "This job type is linked to work orders and templates and cannot be deleted"
  }
  if (state.workOrderCount > 0) {
    return "This job type is linked to work orders and cannot be deleted"
  }
  if (state.templateCount > 0) {
    return "This job type is linked to templates and cannot be deleted"
  }
  return ""
}
```

Each module's `index.ts` adds the new files to the barrel.

## Data additions

### `packages/db/src/management/job-types/read-repository.ts` (new helpers)

```ts
export async function countWorkOrdersByJobTypeId(jobTypeId: string, client?) : Promise<number>
export async function countTemplatesByJobTypeId(jobTypeId: string, client?) : Promise<number>
```

Both count into the relevant tables with `where: { jobTypeId }`.

### Properties data — no additions

Uniqueness is skipped per decision 1. No `propertyNameExists` read, no schema change.

## Use case shapes

### Common rules

- Every use case wraps its body in `withDatabaseTransaction((tx) => ..., client)` so a caller can compose inside an outer transaction.
- Every use case returns the normalized detail record (read back after write) or `{ ok: true }` for delete — same return shape pattern as contacts / services.
- Validation: use case calls the domain form validator (or minimal field-required check) up front. If it returns a non-empty message, throw a `*_VALIDATION_FAILED` execution error with that message.
- P2002 (unique violation): catch via existing `isP2002(error, "name")` helper in `packages/application/src/shared/prisma-errors.ts`. Translate to `*_NAME_CONFLICT`.
- P2025 (record not found on update/delete): catch and translate to `*_NOT_FOUND`.
- Input shape: use cases accept the existing `Create*RecordInput` / `Update*RecordInput` types from `@builders/db` (same pattern as contacts). Keeps the input close to what the data layer expects; saves a form→record mapping layer.

### Management Companies

- **createManagementCompanyUseCase(input, client?)** — validate name required → `createManagementCompanyRecord` → catch P2002 on `name` → translate to `MANAGEMENT_COMPANY_NAME_CONFLICT`. Return the detail record.
- **updateManagementCompanyUseCase(id, input, client?)** — same validation for name-when-provided → `updateManagementCompanyRecord` → catch P2002 → `MANAGEMENT_COMPANY_NAME_CONFLICT`; catch P2025 → `MANAGEMENT_COMPANY_NOT_FOUND`.
- **deleteManagementCompanyUseCase(id, client?)** — `countPropertiesByManagementCompanyId` → `isManagementCompanyDeleteBlocked` → if blocked, throw `MANAGEMENT_COMPANY_IN_USE` with `getManagementCompanyDeleteBlockedMessage(state)`; else `deleteManagementCompanyRecordById` → catch P2025 → `MANAGEMENT_COMPANY_NOT_FOUND`. Returns `{ ok: true }`.

### Properties

- **createPropertyUseCase** — validate name required → `createPropertyRecord` → return detail. No P2002 handling (name not unique). `instructions` + all new schema fields flow through the record input.
- **updatePropertyUseCase** — validate name-when-provided → `updatePropertyRecord` → catch P2025 → `PROPERTY_NOT_FOUND`.
- **deletePropertyUseCase** — `countTemplatesByPropertyId` → `isPropertyDeleteBlocked` → throw `PROPERTY_IN_USE` with `getPropertyDeleteBlockedMessage(state)`; else `deletePropertyRecordById` → catch P2025 → `PROPERTY_NOT_FOUND`.

### Job Types

- **createJobTypeUseCase** — name required → `createJobTypeRecord` → catch P2002 → `JOB_TYPE_NAME_CONFLICT`.
- **updateJobTypeUseCase** — same, plus P2025 → `JOB_TYPE_NOT_FOUND`.
- **deleteJobTypeUseCase** — `countWorkOrdersByJobTypeId` (and `countTemplatesByJobTypeId` if question 3 → both) → `isJobTypeDeleteBlocked` → throw `JOB_TYPE_IN_USE` with `getJobTypeDeleteBlockedMessage(state)`.

## Errors (one per module)

Pattern mirrors `ContactExecutionError` / `ServiceExecutionError`. Fields: `code`, `message`, `status`, optional `field`, optional `payload`.

### Management Companies error codes
```
MANAGEMENT_COMPANY_VALIDATION_FAILED
MANAGEMENT_COMPANY_NOT_FOUND
MANAGEMENT_COMPANY_NAME_CONFLICT
MANAGEMENT_COMPANY_IN_USE
```

### Properties error codes
```
PROPERTY_VALIDATION_FAILED
PROPERTY_NOT_FOUND
PROPERTY_IN_USE
```
(No `NAME_CONFLICT` — property name is not unique.)

### Job Types error codes
```
JOB_TYPE_VALIDATION_FAILED
JOB_TYPE_NOT_FOUND
JOB_TYPE_NAME_CONFLICT
JOB_TYPE_IN_USE
```

Each `errors.ts` exports the class + a union of codes.

## Reference files

- `packages/application/src/flooring/warehouses/create-warehouse.ts` — canonical unique-name-conflict pattern with `isP2002` catch.
- `packages/application/src/flooring/contacts/{errors,types,create-contact,update-contact,delete-contact,index}.ts` — minimal structure template.
- `packages/application/src/shared/prisma-errors.ts` — `isP2002(error, targetColumn?)` helper, reused as-is.

## Critical files

**Create:**
- `packages/domain/src/management/management-companies/error-messages.ts`
- `packages/domain/src/management/properties/error-messages.ts`
- `packages/domain/src/management/job-types/error-messages.ts`
- `packages/domain/src/management/job-types/delete-rules.ts`
- `packages/application/src/management/management-companies/{errors,types,create-management-company,update-management-company,delete-management-company,index}.ts`
- `packages/application/src/management/properties/{errors,types,create-property,update-property,delete-property,index}.ts`
- `packages/application/src/management/job-types/{errors,types,create-job-type,update-job-type,delete-job-type,index}.ts`

**Edit:**
- `packages/domain/src/management/management-companies/index.ts` — add error-messages export.
- `packages/domain/src/management/properties/index.ts` — add error-messages export.
- `packages/domain/src/management/job-types/index.ts` — add error-messages + delete-rules exports.
- `packages/db/src/management/job-types/read-repository.ts` — add `countWorkOrdersByJobTypeId` + `countTemplatesByJobTypeId`.
- `packages/application/src/index.ts` — add three new module barrels.

(No schema migration this phase.)

## Execution order

1. **Pre-flight** — all three packages build green (confirm baseline after Phase 4).
2. **Domain additions** (error-messages for all three modules + job-type delete-rules), wire into index barrels, build `@builders/domain` green.
3. **Data additions** (job-type `countWorkOrdersByJobTypeId` + `countTemplatesByJobTypeId`), build `@builders/db` green.
4. **Application — management companies** module files (errors → types → create → update → delete → index), wire into `packages/application/src/index.ts`. Build `@builders/application` green after each sub-module lands.
5. **Application — properties** module files (same).
6. **Application — job types** module files (same).
7. **Verification** (see below).
8. **Single commit**: "Phase 5: application layer for management-companies, properties, job-types (create/update/delete use cases)".

## Concerns

1. **Use cases do not touch apps/web.** No route, no page, no UI concern. HTTP wiring is Phase 7 when API routes are rebuilt.
2. **Form validation in use cases is minimal.** We only check `name.trim() !== ""` since the rich `validateXForm` functions include UI-form fields (zip normalization, etc.) that the record input doesn't carry. The full form validators still live in domain for the UI to call pre-submit.
3. **Thin-wrapper write-mutations in module `data/mutations.ts`** (from Phase 3) still exist and bypass use cases. Phase 7 API-route rebuild will delete those thin wrappers in favor of importing use cases from `@builders/application`. This phase does not touch those wrappers.
4. **Job-type delete query cost** — counting work-orders + templates on every delete is O(indexed). Both FK columns have indexes (`@@index([jobTypeId])` on template + work-order). No risk.
5. **Property uniqueness gap (accepted).** `Property.name` is not unique at the schema level and `createPropertyUseCase` does not check for duplicates. Two properties with identical names are legal. Document in the plan and revisit only if a future requirement forces the issue.
6. **P2025 catch** — Prisma throws on update/delete when no record matched. Caught at the use-case boundary and translated to `*_NOT_FOUND` with the domain-supplied message.
7. **Transaction composition** — all three delete use cases do a count-read + delete-write inside a single transaction; if another process creates a linked row between the count and delete, the FK constraint at delete time would fail. Accept this race (rare; FK error would bubble as Prisma error). Alternative: serialize via `SELECT FOR UPDATE` — overkill for current scale.
8. **Tests are out of scope** this phase, per sweep direction.

## Verification

- `npm run build --workspace @builders/domain` → exit 0.
- `npm run build --workspace @builders/db` → exit 0.
- `npm run build --workspace @builders/application` → exit 0.
- `rg "import.*from \"apps/" packages/application/src/management/` → zero hits (no apps/** imports).
- `rg "from \"next\"" packages/application/src/management/` → zero hits (no Next.js imports).
- `rg "new Error\\(" packages/application/src/management/` → zero hits (only execution errors).
- `rg "from \"\\.\\./(create|update|delete)" packages/application/src/management/` → zero hits (use cases don't import each other).
- `ls packages/application/src/management/{management-companies,properties,job-types}` — all three folders populated with the six expected files.
- `npm run typecheck --workspace @builders/web` — no new errors beyond the known Phase-6 UI surface.

## Out of scope (explicit)

- API route rebuild + validators (Phase 7, after application layer is stable).
- Templates + work-orders application layer (later phase; those modules still need more work).
- UI / dashboard pages for these three modules (Phase 6).
- Optimistic-lock checks, mutation receipts, rate limits — route-level concerns, not use-case scope.
- Seeded job-types list (user will supply when UI is ready).
