# Manufacturers Module Gap Scan

## Summary

The manufacturers module has clean layer boundaries, compliant route policy usage, correct response shapes, and no legacy file remnants. The most significant gaps are: (1) zero use cases wrap in `withDatabaseTransaction()`, creating a race-condition window between uniqueness checks and inserts/updates — the `@unique` DB constraint is the only real guard; (2) `validateUpdateManufacturerPrimarySectionInput` lives in the application layer and performs request-body parsing, which the docs assign to the route layer; (3) domain validators return strings instead of throwing, violating `VALIDATION.md`; (4) use case function names (`createManufacturerRecord`, `deleteManufacturerRecord`) collide with data-layer naming conventions, making call sites ambiguous. There is also a likely dead PATCH handler on `[id]/route.ts` that duplicates the primary-section route.

---

## Section-by-Section Findings

### 1. Layer Boundaries

**Admin reference:**
- `packages/domain/src/admin/` imports nothing outside itself. No Zod, no external packages.
- `packages/application/src/admin/` imports only `@builders/db`, `@builders/domain`, and `bcrypt` (for password hashing). No Next.js, no `@/server/http/`.
- `packages/db/src/admin/` imports only Prisma.
- `apps/web/modules/admin/controller/` imports `@builders/domain` (for types) and shared engines. Never `@builders/application` or `@builders/db`.
- `apps/web/modules/admin/components/` imports `@builders/domain` (for formatters/types) and shared engines. Never `@builders/application` or `@builders/db`.

**Manufacturers current state:**
- `packages/domain/src/flooring/manufacturers/` — zero external imports across all four files (`types.ts`, `manufacturer-rules.ts`, `validators.ts`, `index.ts`). Clean.
- `packages/application/src/flooring/manufacturers/` — imports `@builders/db`, `@builders/domain`, and `Prisma` (for `PrismaClientKnownRequestError` in create and update). No Next.js, no `@/server/http/`. Clean.
- `packages/db/src/flooring/manufacturers/` — imports only `@prisma/client` and internal `../../client.js`. No `@builders/domain` or `@builders/application`. Clean.
- `apps/web/modules/manufacturers/controller/` — imports `@builders/domain` (types only), shared engines, and `@/modules/manufacturers/data/mutations`. No `@builders/application` or `@builders/db`. Clean.
- `apps/web/modules/manufacturers/components/` — imports `@builders/domain` (types/formatters), shared engines, and local controller/data files. No `@builders/application` or `@builders/db`. Clean.
- No `createAppError` usage anywhere in `packages/application/src/flooring/manufacturers/`. Clean.

**Gap:** None.

**Evidence:** All import statements verified in files listed above.

---

### 2. Transaction Boundaries

**Admin reference:**
- `create-managed-user.ts`: wraps in `withDatabaseTransaction(async (tx) => { ... })`. The create call receives `tx`.
- `update-managed-user.ts`: wraps in `withDatabaseTransaction()`. Fetches current record, validates governance rules, updates — all inside `tx`.
- `delete-managed-user.ts`: wraps in `withDatabaseTransaction()`. Fetches record, validates governance, deletes — all inside `tx`.
- `set-user-password.ts`: wraps in `withDatabaseTransaction()`.
- Pattern: transaction client is passed to every repository call via `client` parameter.

**Manufacturers current state:**

- **`createManufacturerRecord`** (`create-manufacturer.ts`, lines 6–32): No `withDatabaseTransaction()`. Sequence:
  1. `manufacturerCompanyNameExists(normalizedName)` — read (no tx)
  2. `createManufacturerPrimaryRecord(input)` — write (no tx)
  3. P2002 catch as fallback
  - Race window: another request could insert the same name between step 1 and step 2. The `@unique` constraint on `companyName` catches it at step 3 via P2002, so data integrity is preserved. But the application-level uniqueness check (step 1) can produce a false negative under concurrency.

- **`replaceManufacturerPrimarySection`** (`update-manufacturer.ts`, lines 39–69): No `withDatabaseTransaction()`. Sequence:
  1. `manufacturerCompanyNameExists(normalizedName, id)` — read (no tx)
  2. `updateManufacturerPrimaryRecord(id, input)` — write (no tx)
  3. `getManufacturerById(id)` — re-read to return fresh data (no tx)
  4. P2002 catch as fallback
  - Same race window as create. Additionally, the re-read at step 3 is a separate query outside any transaction — the returned data could reflect a concurrent write, not the write from step 2.

- **`deleteManufacturerRecord`** (`delete-manufacturer.ts`, lines 5–27): No `withDatabaseTransaction()`. Sequence:
  1. `getManufacturerDeleteState(id)` — read (no tx)
  2. `isManufacturerDeleteBlocked(manufacturer._count.products)` — domain check
  3. `deleteManufacturerRecordById(id)` — write (no tx)
  - Race window: a product could be linked to this manufacturer between step 1 and step 3. The `onDelete: Restrict` foreign key on `FlooringProduct.manufacturerId` would catch this at the Prisma level, producing a P2003 error. However, the route's `routeError()` handler normalizes P2003 to a 409, so data integrity is preserved — but the error message would be a generic Prisma message, not the user-friendly "This manufacturer has linked products" message from the domain check.

- None of the three use cases accept an optional `client` parameter. They cannot be composed into a larger transaction.

**Gap:** All three use cases lack `withDatabaseTransaction()`. Doc citation: `docs/cross-cutting/TRANSACTIONS.md` line 8: "Every multi-step mutation runs in an explicit `withDatabaseTransaction()`." Doc citation: `docs/layers/APPLICATION.md` line 12: "Every use case function accepts an optional `client` parameter for transaction propagation."

**Evidence:**
- `packages/application/src/flooring/manufacturers/create-manufacturer.ts` — no `withDatabaseTransaction` import or call
- `packages/application/src/flooring/manufacturers/update-manufacturer.ts` — no `withDatabaseTransaction` import or call
- `packages/application/src/flooring/manufacturers/delete-manufacturer.ts` — no `withDatabaseTransaction` import or call
- Admin reference: `packages/application/src/admin/create-managed-user.ts`, `update-managed-user.ts`, `delete-managed-user.ts` — all use `withDatabaseTransaction()`

---

### 3. Uniqueness Enforcement

**Prisma schema:**
`companyName String @unique` on the `FlooringManufacturer` model (`packages/db/prisma/schema.prisma`, lines 222–234). This is a database-level unique constraint. It is case-sensitive at the DB level; case-insensitive enforcement is done at the application layer.

**Domain layer:**
- `normalizeManufacturerCompanyNameForUniqueness(value)` in `manufacturer-rules.ts` (lines 1–3): trims and lowercases.
- `isManufacturerCompanyNameConflict(exists)` in `manufacturer-rules.ts` (lines 5–7): returns `exists` (boolean passthrough).

**Application layer:**
- `createManufacturerRecord` (lines 8–13): calls `manufacturerCompanyNameExists(normalizedName)` before insert. Throws `MANUFACTURER_NAME_CONFLICT` (409) if true.
- `replaceManufacturerPrimarySection` (lines 45–52): calls `manufacturerCompanyNameExists(normalizedName, id)` (excludes self) before update. Throws `MANUFACTURER_NAME_CONFLICT` (409) if true.
- Both also catch P2002 and throw `MANUFACTURER_NAME_CONFLICT` as a fallback.

**Data layer:**
- `manufacturerCompanyNameExists` in `read-repository.ts` (lines 77–94): uses `findFirst` with `mode: "insensitive"`, excludes `currentId` if provided. Accepts optional transaction client but is never called with one (since use cases don't open transactions).

**Gap:** The pre-insert uniqueness check and the insert are not in the same transaction. The `@unique` constraint catches races (with P2002 → ManufacturerExecutionError mapping), so data integrity is preserved. However, the case-insensitive check (`mode: "insensitive"`) at the application layer may disagree with the case-sensitive `@unique` constraint at the DB layer — a name that passes the app-level check could still violate the DB constraint if the exact casing matches but the normalized forms differ, or vice versa.

**Evidence:**
- `packages/db/prisma/schema.prisma` lines 222–234 (`companyName String @unique`)
- `packages/application/src/flooring/manufacturers/create-manufacturer.ts` lines 8–13
- `packages/db/src/flooring/manufacturers/read-repository.ts` lines 77–94

---

### 4. Input Validation Placement

**Admin reference:**
- `POST /api/admin/users/route.ts`: route handler calls an inline validator that parses `email` and `role` from the body. The typed result is passed to `createManagedUserUseCase(input, actor)`. The use case receives pre-validated input.
- `PATCH /api/admin/users/[id]/route.ts`: route handler parses `role` inline. The typed result is passed to `updateManagedUserUseCase(id, input, actor)`.
- No admin use case performs request-body parsing.

**Manufacturers current state:**
- `POST /api/manufacturers/route.ts` (line 46): calls `parseMutationEnvelope(body, validateUpdateManufacturerPrimarySectionInput)`. The validator is `validateUpdateManufacturerPrimarySectionInput` — imported from `@builders/application`.
- `PATCH /api/manufacturers/[id]/route.ts` (line 39): same validator.
- `PATCH /api/manufacturers/[id]/primary/section/route.ts` (line 40): same validator.
- `DELETE /api/manufacturers/[id]/route.ts` (line 109): uses `(value) => value` (no parsing needed). Correct.

- The function `validateUpdateManufacturerPrimarySectionInput` lives in `packages/application/src/flooring/manufacturers/update-manufacturer.ts` (lines 6–37). It performs raw body parsing: checks `typeof body.companyName === "string"`, trims, throws `ManufacturerExecutionError` on empty. It also calls `validateManufacturerForm(input)` from the domain layer.

**Gap:** `validateUpdateManufacturerPrimarySectionInput` is a request-body parser (it receives `Record<string, unknown>` and extracts typed fields). Per `docs/execution/EXECUTION_ENGINE.md` step 4 and `docs/cross-cutting/VALIDATION.md` lines 9–12, input parsing is a route-layer concern, not an application-layer concern. Per `docs/layers/APPLICATION.md` line 9: "Application use cases orchestrate — they do not contain business rules of their own." Parsing `typeof body.companyName === "string"` is transport-level parsing, not orchestration. Admin places equivalent logic in the route handler.

Additionally, the same validator is used for both POST (create) and PATCH (update), and it's named `validateUpdate...`. This means create validation is implicitly coupled to the update validator's shape.

**Evidence:**
- `packages/application/src/flooring/manufacturers/update-manufacturer.ts` lines 6–37 (validator function)
- `apps/web/app/api/manufacturers/route.ts` line 46 (POST using it)
- `apps/web/app/api/admin/users/route.ts` (inline parsing in route handler)
- `docs/cross-cutting/VALIDATION.md` line 12: "Validators throw AppError on failure"
- `docs/layers/APPLICATION.md` line 15: "Use cases do not import Next.js, React, or any transport/UI framework"

---

### 5. Domain Validators

**Functions in `packages/domain/src/flooring/manufacturers/`:**

| Function | File | Return type | Throws? |
|----------|------|-------------|---------|
| `normalizeManufacturerCompanyNameForUniqueness(value)` | `manufacturer-rules.ts:1–3` | `string` (transformed value) | No |
| `isManufacturerCompanyNameConflict(exists)` | `manufacturer-rules.ts:5–7` | `boolean` | No |
| `isManufacturerDeleteBlocked(productCount)` | `manufacturer-rules.ts:9–11` | `boolean` | No |
| `normalizeManufacturerCompanyName(value)` | `validators.ts:10–12` | `string` (transformed value) | No |
| `validateManufacturerForm(input, existingManufacturers, currentId)` | `validators.ts:14–32` | `string` (error message or `""`) | No |
| `toManufacturerForm(manufacturer)` | `types.ts:29–37` | `ManufacturerForm` | No |

**Call sites:**

- `normalizeManufacturerCompanyNameForUniqueness`: called in `create-manufacturer.ts:8` and `update-manufacturer.ts:45` (application layer, server-side).
- `isManufacturerCompanyNameConflict`: called in `create-manufacturer.ts:10` and `update-manufacturer.ts:47` (application layer, server-side).
- `isManufacturerDeleteBlocked`: called in `delete-manufacturer.ts:17` (application layer, server-side).
- `normalizeManufacturerCompanyName`: called in `validators.ts:22` (within `validateManufacturerForm`, domain-internal).
- `validateManufacturerForm`: called in `update-manufacturer.ts:28` (application layer, server-side) and presumably from client-side form validation.
- `toManufacturerForm`: called in `use-manufacturer-primary-section.ts:20` (controller, client-side).

**Doc requirement:** `docs/cross-cutting/VALIDATION.md` line 12: "Validators throw `AppError` on failure — never return error strings or booleans. Each error includes `message` and `field`."

**Gap:** `validateManufacturerForm` returns a string (error message or empty string). It is called server-side in `validateUpdateManufacturerPrimarySectionInput` (application layer), which wraps the string return in a `ManufacturerExecutionError` throw. The domain function itself does not throw.

The boolean-returning predicates (`isManufacturerCompanyNameConflict`, `isManufacturerDeleteBlocked`) follow the "Computation" pattern from `docs/layers/DOMAIN.md` — they return derived data. The callers (application use cases) handle throwing. This is consistent with admin's `canDeleteUser()`, `canChangeUserRole()` pattern — those also return booleans with the use case doing the throw. So the boolean predicates are not a gap.

`normalizeManufacturerCompanyName` in `validators.ts` duplicates `normalizeManufacturerCompanyNameForUniqueness` in `manufacturer-rules.ts` — they have identical logic (`value.trim().toLowerCase()`).

**Gap:** `validateManufacturerForm` returns a string instead of throwing. It is used server-side. Doc citation: `docs/cross-cutting/VALIDATION.md` line 12. Note: the doc's line 88 acknowledges "No client/server schema reuse" as a known gap — but `validateManufacturerForm` is used on both sides, so the return-string pattern may be intentional for client reuse.

**Evidence:**
- `packages/domain/src/flooring/manufacturers/validators.ts` lines 14–32
- `packages/application/src/flooring/manufacturers/update-manufacturer.ts` lines 27–35 (wraps string in throw)
- `docs/cross-cutting/VALIDATION.md` line 12

---

### 6. Error Class Usage

**`packages/application/src/flooring/manufacturers/errors.ts` (22 lines):**
```typescript
export class ManufacturerExecutionError extends Error {
  readonly code: string
  readonly status: number
  readonly field?: string
  readonly payload?: Record<string, unknown>
}
```

**Comparison to admin's `GovernanceExecutionError`:**

| Field | GovernanceExecutionError | ManufacturerExecutionError | Match? |
|-------|------------------------|---------------------------|--------|
| `code` | `string` | `string` | Yes |
| `status` | `number` | `number` | Yes |
| `field` | `string?` | `string?` | Yes |
| `payload` | `Record<string, unknown>?` | `Record<string, unknown>?` | Yes |
| `name` | `"GovernanceExecutionError"` | `"ManufacturerExecutionError"` | Yes (pattern match) |

Shape is identical. No gap.

**Error codes thrown per use case:**

| Use case | Error code | Status | Field | Source |
|----------|-----------|--------|-------|--------|
| `createManufacturerRecord` | `MANUFACTURER_NAME_CONFLICT` | 409 | `companyName` | `create-manufacturer.ts:11` and `:22` |
| `replaceManufacturerPrimarySection` | `MANUFACTURER_NAME_CONFLICT` | 409 | `companyName` | `update-manufacturer.ts:49` and `:60` |
| `validateUpdateManufacturerPrimarySectionInput` | `MANUFACTURER_VALIDATION_FAILED` | 400 | `companyName` | `update-manufacturer.ts:15` and `:31` |
| `deleteManufacturerRecord` | `MANUFACTURER_NOT_FOUND` | 404 | — | `delete-manufacturer.ts:11` |
| `deleteManufacturerRecord` | `MANUFACTURER_IN_USE` | 409 | — | `delete-manufacturer.ts:18` |

All errors are `ManufacturerExecutionError` instances. No `createAppError` usage. No generic `Error` throws.

**Gap:** None.

**Evidence:**
- `packages/application/src/flooring/manufacturers/errors.ts` (full file)
- `packages/application/src/admin/errors.ts` (comparison)

---

### 7. Route Policy Compliance

**Checklist per handler:**

#### GET /api/manufacturers (`route.ts:8–24`)
| Step | Required | Present | Evidence |
|------|----------|---------|----------|
| `applyRoutePolicy()` | Yes | Yes | line 9 |
| `enforceQueryRateLimit()` | Yes | Yes | line 13 |
| `routeJson()` | Yes | Yes | line 18 |
| `routeError()` | Yes | Yes | line 20 |

No gap.

#### POST /api/manufacturers (`route.ts:26–62`)
| Step | Required | Present | Evidence |
|------|----------|---------|----------|
| `applyRoutePolicy()` | Yes | Yes | line 27 |
| `parseMutationEnvelope()` | Yes | Yes | line 46 |
| `enforceMutationReceipt()` | Yes | Yes | line 48 |
| `withMutationTelemetry()` | Yes | Yes | line 51 |
| `finalizeMutationReceipt()` | Yes | Yes | line 59 |
| `routeJson()` | Yes | Yes | line 61 |
| `routeError()` | Yes | Yes | line 63 |
| `assertExpectedUpdatedAt()` | N/A (create) | N/A | — |

No gap.

#### PATCH /api/manufacturers/[id] (`[id]/route.ts:22–84`)
| Step | Required | Present | Evidence |
|------|----------|---------|----------|
| `applyRoutePolicy()` | Yes | Yes | line 23 |
| `parseMutationEnvelope()` | Yes | Yes | line 39 |
| `assertExpectedUpdatedAt()` | Yes | Yes | line 43 |
| `enforceMutationReceipt()` | Yes | Yes | line 50 |
| `withMutationTelemetry()` | Yes | Yes | line 57 |
| `finalizeMutationReceipt()` | Yes | Yes | line 73 |
| `routeJson()` | Yes | Yes | line 80 |
| `routeError()` | Yes | Yes | line 82 |
| `parseUuidParam()` | Recommended | **No** | `id` taken raw from `context.params` |

Gap: No UUID validation on the `id` param. The primary/section route does use `parseUuidParam()`. Admin's `[id]/route.ts` also uses `parseUuidParam()`.

#### DELETE /api/manufacturers/[id] (`[id]/route.ts:86–145`)
| Step | Required | Present | Evidence |
|------|----------|---------|----------|
| `applyRoutePolicy()` | Yes | Yes | line 87 |
| `parseMutationEnvelope()` | Yes | Yes | line 109 |
| `assertExpectedUpdatedAt()` | Yes | Yes | line 114 |
| `enforceMutationReceipt()` | Yes | Yes | line 121 |
| `withMutationTelemetry()` | Yes | Yes | line 129 |
| `finalizeMutationReceipt()` | Yes | Yes | line 140 |
| `routeJson()` | Yes | Yes | line 145 |
| `routeError()` | Yes | Yes | line 147 |
| `parseUuidParam()` | Recommended | **No** | `id` taken raw from `context.params` |

Same gap as PATCH.

#### PATCH /api/manufacturers/[id]/primary/section (`primary/section/route.ts:22–86`)
| Step | Required | Present | Evidence |
|------|----------|---------|----------|
| `applyRoutePolicy()` | Yes | Yes | line 23 |
| `parseUuidParam()` | Yes | Yes | line 36 |
| `parseMutationEnvelope()` | Yes | Yes | line 40 |
| `assertExpectedUpdatedAt()` | Yes | Yes | line 44 |
| `enforceMutationReceipt()` | Yes | Yes | line 51 |
| `withMutationTelemetry()` | Yes | Yes | line 59 |
| `finalizeMutationReceipt()` | Yes | Yes | line 75 |
| `routeJson()` | Yes | Yes | line 82 |
| `routeError()` | Yes | Yes | line 84 |

No gap. This route is fully compliant.

**Additional finding:** No legacy `authorizeManufacturersRoute` or `requireRouteAccess` calls remain. The export exists in `lookup-domains.ts` but is unused by any route.

**Gap:** PATCH `[id]/route.ts` and DELETE `[id]/route.ts` do not validate the UUID param with `parseUuidParam()`. The primary/section route does. Admin's `[id]/route.ts` does.

**Evidence:**
- `apps/web/app/api/manufacturers/[id]/route.ts` line 37 (`const { id } = await context.params` — no validation)
- `apps/web/app/api/manufacturers/[id]/primary/section/route.ts` line 36 (`parseUuidParam(rawId, "id")`)
- `apps/web/app/api/admin/users/[id]/route.ts` (uses `parseUuidParam`)

---

### 8. Response Shape Compliance

| Route | Expected shape | Actual shape | Status |
|-------|---------------|-------------|--------|
| GET /api/manufacturers | `{ manufacturers: [...] }` | `{ manufacturers }` (line 18) | Compliant |
| POST /api/manufacturers | `{ manufacturer: {...} }` + 201 | `{ manufacturer: result }` + 201 (line 61) | Compliant |
| PATCH /api/manufacturers/[id] | `{ manufacturer: {...} }` | `{ manufacturer }` (line 80) | Compliant |
| DELETE /api/manufacturers/[id] | `{ ok: true }` | `{ ok: true as const }` (line 143) | Compliant |
| PATCH .../primary/section | `{ manufacturer: {...} }` | `{ manufacturer: await getManufacturerById(id) }` (line 74) | Compliant |

No `{ data: ... }`, `{ success: true, ... }`, or top-level arrays found. All responses use `routeJson()`.

**Gap:** None.

**Evidence:** All route files listed above.

---

### 9. Module Structure

**Doc requirement** (`docs/patterns/MODULE_ANATOMY.md`):
```
modules/{name}/
├── controller/
├── data/
│   ├── queries.ts
│   └── mutations.ts (optional)
├── components/
│   ├── list/
│   └── record/
└── views/ (optional)
```

**Manufacturers actual structure:**
```
modules/manufacturers/
├── controller/
│   ├── use-manufacturers-list-controller.ts
│   └── use-manufacturer-primary-section.ts
├── data/
│   ├── queries.ts
│   └── mutations.ts
├── components/
│   ├── list/
│   │   ├── manufacturers-client.tsx
│   │   └── manufacturers-table.tsx
│   └── record/
│       ├── manufacturer-create-client.tsx
│       ├── manufacturer-detail-client.tsx
│       ├── manufacturer-record-panel.tsx
│       └── manufacturer-primary-fields-section.tsx
```

**Legacy file check (all confirmed absent):**
- `modules/manufacturers/services.ts` — does not exist
- `modules/manufacturers/validators.ts` — does not exist
- `modules/manufacturers/domain/` — does not exist
- `modules/manufacturers/application/` — does not exist
- `modules/manufacturers/components/manufacturers-client.tsx` (re-export shim) — does not exist
- `modules/manufacturers/data/server-records.ts` — does not exist

**`data/queries.ts`:** imports from `@builders/db` (correct). Re-exports `listManufacturers` and `getManufacturerById`.

**Gap:** None. Structure is fully compliant.

**Evidence:** File listing above. Glob confirmed no other files exist in the module directory.

---

### 10. Cross-Module Dependencies

**Imports of `@/modules/manufacturers/` from outside the module:**
- `apps/web/app/dashboard/manufacturers/page.tsx` — imports `ManufacturersClient`, `getManufacturersPageData`
- `apps/web/app/dashboard/manufacturers/[id]/page.tsx` — imports `ManufacturerDetailClient`, `getManufacturerDetailPageData`
- `apps/web/app/dashboard/manufacturers/new/page.tsx` — imports `ManufacturerCreateClient`
- `apps/web/tests/engines/record-view/record-create-clients.test.tsx` — test file, acceptable

All imports are from `components/` or `data/queries.ts`. No imports from `domain/`, `application/`, or `controller/` from outside the module. Compliant.

**`listManufacturers` call sites:**
- `apps/web/modules/products/data/queries.ts` line 5 — imports from `@builders/db` (correct, not from `@/modules/manufacturers/`)
- `apps/web/modules/manufacturers/data/queries.ts` — re-exports from `@builders/db`
- `apps/web/app/api/manufacturers/route.ts` — imports from `@builders/db`
- Test files — mock

**Gap:** None.

**Evidence:** Grep results for `@/modules/manufacturers` and `listManufacturers` across the codebase.

---

### 11. Test Coverage

**Test files:**

| File | Layer | Covers | Mock strategy |
|------|-------|--------|---------------|
| `manufacturers.test.ts` (408 lines) | Route | GET, POST, PATCH, DELETE on `/api/manufacturers/` and `/api/manufacturers/[id]`. Also includes `validateManufacturerForm` domain tests inline. | Mocks `@builders/db` directly (listManufacturers, createManufacturerPrimaryRecord, etc.) and route-policy functions |
| `manufacturers-client.test.tsx` (155 lines) | Component | ManufacturersClient navigation, ManufacturerDetailClient save + error display | Mocks `requestJson` for HTTP |
| `manufacturers-primary-section-route.test.ts` (182 lines) | Route | PATCH `/api/manufacturers/[id]/primary/section` — mutation envelope, revision conflicts, validation failures | Mocks `@builders/application` (replaceManufacturerPrimarySection, validateUpdateManufacturerPrimarySectionInput) and route-policy functions |

**Mock strategy inconsistency:** `manufacturers.test.ts` mocks `@builders/db` directly in route tests. `manufacturers-primary-section-route.test.ts` mocks `@builders/application` in route tests. Admin reference mocks `@builders/application` for route tests (the use case is the unit boundary). The db-level mocking in `manufacturers.test.ts` means the use case logic is also being exercised in route tests — blurring the test boundary.

**Missing test categories:**

| Category | Exists? | Admin has it? |
|----------|---------|---------------|
| Standalone application tests (use case orchestration) | **No** | Yes |
| Standalone domain tests (`manufacturer-rules.ts`) | **No** (inline in `manufacturers.test.ts`) | Yes |
| Standalone form validation tests | **No** (inline in `manufacturers.test.ts`) | N/A |
| Component tests | Yes | Yes |
| Route tests | Yes | Yes |

**Gap:** No standalone application test file. No standalone domain test file. Admin has both. Doc citation: `docs/cross-cutting/TESTING.md` specifies separate test files per layer: "Route tests assert HTTP status codes and response shapes. Application tests assert use-case orchestration. Domain tests assert invariants."

**Evidence:**
- `apps/web/tests/modules/manufacturers/manufacturers.test.ts`
- `apps/web/tests/modules/manufacturers/manufacturers-client.test.tsx`
- `apps/web/tests/modules/manufacturers/manufacturers-primary-section-route.test.ts`
- No file matching `manufacturers-application.test.ts` or `manufacturers-domain.test.ts` exists

---

### 12. Mutation Envelope Wiring (Client Side)

**`apps/web/modules/manufacturers/data/mutations.ts` (30 lines):**

| Function | Wraps in `withMutationMeta()`? | Target route |
|----------|-------------------------------|-------------|
| `createManufacturerRequest(input)` | Yes (line 9) | `POST /api/manufacturers` |
| `updateManufacturerRequest(id, input, revisionKey)` | Yes (line 17) | `PATCH /api/manufacturers/${id}/primary/section` |
| `deleteManufacturerRequest(id, updatedAt)` | Yes (line 25) | `DELETE /api/manufacturers/${id}` |

**Controller wiring:**
- `use-manufacturer-primary-section.ts` calls `updateManufacturerRequest` (line 22) and `deleteManufacturerRequest` (line 29) via `data/mutations.ts`. No inline `requestJson()`.
- `manufacturer-create-client.tsx` calls `createManufacturerRequest` via `data/mutations.ts`. No inline `requestJson()`.

**Gap:** None. All mutation helpers use `withMutationMeta()`. All controllers route through `data/mutations.ts`.

**Evidence:**
- `apps/web/modules/manufacturers/data/mutations.ts` lines 7–29
- `apps/web/modules/manufacturers/controller/use-manufacturer-primary-section.ts` lines 22, 29

---

### 13. Outbox Events

**Current state:** No manufacturer use case writes an outbox event. No `createQueueOutboxEvent` call exists anywhere in `packages/application/src/flooring/manufacturers/`.

**Admin reference:** Admin use cases also do not write outbox events. This appears to be an accepted pattern for modules that don't trigger async workflows.

**Forward-looking concern:** If manufacturers ever need outbox events (audit log, external sync, search index rebuild), the lack of transaction boundaries in the use cases means the outbox write cannot be colocated with the state mutation — the prerequisite (`docs/cross-cutting/TRANSACTIONS.md` line 9: "The outbox event write is always in the same transaction as the state mutation") cannot be met without first adding `withDatabaseTransaction()`.

**Gap:** None today. Dependency on Section 2 (transaction boundaries) for future outbox adoption.

**Evidence:** Grep for `createQueueOutboxEvent` in `packages/application/src/flooring/manufacturers/` returned zero hits.

---

## Additional Findings

### A. Duplicate PATCH Routes

**Observation:** Both `app/api/manufacturers/[id]/route.ts` (PATCH handler, lines 22–84) and `app/api/manufacturers/[id]/primary/section/route.ts` (PATCH handler, lines 22–86) call `replaceManufacturerPrimarySection(id, input)` with the same validator.

**Client usage:** `data/mutations.ts` sends updates to `/api/manufacturers/${id}/primary/section` (line 15). The PATCH handler on `[id]/route.ts` does not appear to be called by any client code.

**Impact:** The `[id]/route.ts` PATCH handler appears to be dead code. It also lacks `parseUuidParam()` validation that the primary/section route has.

**Evidence:**
- `apps/web/modules/manufacturers/data/mutations.ts` line 15 (update targets primary/section)
- `apps/web/app/api/manufacturers/[id]/route.ts` lines 22–84 (PATCH handler)
- `apps/web/app/api/manufacturers/[id]/primary/section/route.ts` lines 22–86 (PATCH handler)

### B. Use Case Function Naming

**Admin reference naming:** `createManagedUserUseCase`, `updateManagedUserUseCase`, `deleteManagedUserUseCase` — the `UseCase` suffix clearly distinguishes application-layer orchestration from data-layer persistence.

**Manufacturers naming:**
- `createManufacturerRecord` (create use case) — collides with data-layer naming convention (`create*Record` is the pattern used in `write-repository.ts`: `createManufacturerPrimaryRecord`)
- `replaceManufacturerPrimarySection` (update use case) — unique name, no collision, but inconsistent with admin's `update*UseCase` pattern
- `deleteManufacturerRecord` (delete use case) — collides with `deleteManufacturerRecordById` in the data layer
- `validateUpdateManufacturerPrimarySectionInput` — exported from application layer, used as route-level validator

**Impact:** Naming ambiguity makes it harder to identify which layer a function belongs to at call sites.

**Evidence:**
- `packages/application/src/flooring/manufacturers/create-manufacturer.ts` line 6 (`createManufacturerRecord`)
- `packages/db/src/flooring/manufacturers/write-repository.ts` line 19 (`createManufacturerPrimaryRecord`)
- `packages/application/src/admin/create-managed-user.ts` (`createManagedUserUseCase`)

### C. Duplicate Normalizer Functions

`normalizeManufacturerCompanyName(value)` in `validators.ts:10–12` and `normalizeManufacturerCompanyNameForUniqueness(value)` in `manufacturer-rules.ts:1–3` have identical logic: `return value.trim().toLowerCase()`.

**Evidence:**
- `packages/domain/src/flooring/manufacturers/validators.ts` lines 10–12
- `packages/domain/src/flooring/manufacturers/manufacturer-rules.ts` lines 1–3

---

## Critical Gaps

Gaps that violate a documented rule or represent a latent correctness bug:

1. **No transaction boundaries on any use case.** All three use cases (create, update, delete) perform multi-step read-then-write sequences without `withDatabaseTransaction()`. The uniqueness check and insert in `createManufacturerRecord` can race. — `packages/application/src/flooring/manufacturers/create-manufacturer.ts`, `update-manufacturer.ts`, `delete-manufacturer.ts`. Doc: `docs/cross-cutting/TRANSACTIONS.md` line 8, `docs/layers/APPLICATION.md` line 12.

2. **No `client` parameter on use case functions.** Use cases cannot be composed into a parent transaction. — `packages/application/src/flooring/manufacturers/create-manufacturer.ts:6`, `update-manufacturer.ts:39`, `delete-manufacturer.ts:5`. Doc: `docs/layers/APPLICATION.md` line 12.

3. **Request-body parsing function (`validateUpdateManufacturerPrimarySectionInput`) lives in the application layer.** It accepts `Record<string, unknown>` and performs `typeof` checks — this is route-layer work. — `packages/application/src/flooring/manufacturers/update-manufacturer.ts:6–37`. Doc: `docs/execution/EXECUTION_ENGINE.md` step 4, `docs/layers/APPLICATION.md` line 9.

4. **`validateManufacturerForm` returns a string instead of throwing.** Used server-side in the application layer. — `packages/domain/src/flooring/manufacturers/validators.ts:14–32`. Doc: `docs/cross-cutting/VALIDATION.md` line 12.

5. **Missing `parseUuidParam()` on `[id]/route.ts` PATCH and DELETE handlers.** Raw `context.params.id` is passed to use cases without UUID validation. The primary/section route does validate. — `apps/web/app/api/manufacturers/[id]/route.ts` lines 37, 105. Reference: `apps/web/app/api/manufacturers/[id]/primary/section/route.ts` line 36.

---

## Structural Gaps

Gaps that violate the admin reference pattern but not an explicit doc rule:

1. **Use case function names collide with data-layer naming.** `createManufacturerRecord` and `deleteManufacturerRecord` in the application layer follow the `*Record` pattern used by data-layer repositories. Admin uses `*UseCase` suffix. — `packages/application/src/flooring/manufacturers/create-manufacturer.ts:6`, `delete-manufacturer.ts:5`.

2. **Duplicate PATCH route.** `[id]/route.ts` PATCH and `[id]/primary/section/route.ts` PATCH both call `replaceManufacturerPrimarySection`. The `[id]/route.ts` PATCH is not called by any client code. — `apps/web/app/api/manufacturers/[id]/route.ts:22–84`.

3. **No GET handler on `[id]/route.ts`.** Admin has a GET handler for single-record fetch. Manufacturers loads detail data server-side only. — `apps/web/app/api/manufacturers/[id]/route.ts` (only PATCH and DELETE exported). Reference: `apps/web/app/api/admin/users/[id]/route.ts` (exports GET).

4. **Duplicate normalizer function.** `normalizeManufacturerCompanyName` in `validators.ts` and `normalizeManufacturerCompanyNameForUniqueness` in `manufacturer-rules.ts` are identical. — `packages/domain/src/flooring/manufacturers/validators.ts:10–12`, `manufacturer-rules.ts:1–3`.

5. **Update use case re-fetches after write.** `replaceManufacturerPrimarySection` calls `updateManufacturerPrimaryRecord` (returns void) then `getManufacturerById` as a separate query. Admin's update returns the normalized record directly from the write. — `packages/application/src/flooring/manufacturers/update-manufacturer.ts:57–58`.

---

## Polish Gaps

Style, consistency, and test coverage gaps that don't affect correctness:

1. **No standalone application test file.** Use case orchestration (create uniqueness check, delete blocking, update validation) is not tested in isolation. — Missing: `tests/modules/manufacturers/manufacturers-application.test.ts`.

2. **No standalone domain test file.** `manufacturer-rules.ts` predicates are tested inline within `manufacturers.test.ts`. — Missing: `tests/modules/manufacturers/manufacturers-domain.test.ts`.

3. **Mock strategy inconsistency across test files.** `manufacturers.test.ts` mocks `@builders/db` directly in route tests (exercises use case logic). `manufacturers-primary-section-route.test.ts` mocks `@builders/application` (treats use case as boundary). — `apps/web/tests/modules/manufacturers/manufacturers.test.ts`, `manufacturers-primary-section-route.test.ts`.

4. **Same validator used for create and update.** `validateUpdateManufacturerPrimarySectionInput` is named for update but passed to POST create as well. — `apps/web/app/api/manufacturers/route.ts` line 46.

---

## Questions Requiring Decisions

1. **Should the PATCH handler on `[id]/route.ts` be removed?** It duplicates `[id]/primary/section/route.ts` and is not called by any client code. If it is intentionally kept for a future non-section update pattern, it needs `parseUuidParam()` added. If it is dead code, it should be deleted.

2. **Should `validateManufacturerForm` remain a string-returning function for client-side reuse, or should it be split into a client-side helper (returns string) and a server-side validator (throws)?** The doc says throw on the server; the codebase has no client/server schema reuse convention.

3. **Should the case-insensitive uniqueness check at the application layer be aligned with the case-sensitive `@unique` constraint at the database layer?** The current mismatch means the application may allow a name that the DB rejects (P2002 caught) or reject a name that the DB would allow.

4. **Is the `*Record` naming convention for use case functions intentional (to match the data they return) or accidental (should be `*UseCase`)?**
