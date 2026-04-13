# Gap Analysis: Manufacturers, Contacts, Services vs. Admin (Reference) + Docs

## 1. Application Layer — Missing Transaction Boundaries

| Module | Wraps mutations in `withDatabaseTransaction()`? |
|--------|--------------------------------------------------|
| **Admin** (reference) | Yes — create, update, delete all wrapped |
| **Contacts** | Only delete — create/update have **no transaction** |
| **Manufacturers** | **None** — create, update, delete all unwrapped |
| **Services** | **None** — create, update, delete all unwrapped |

**Impact:** The docs (`APPLICATION.md`) require _"Explicit withDatabaseTransaction() opened for mutations."_ This is a clear violation in all three modules for most use cases.

---

## 2. Application Layer — Inconsistent Validation Placement

| Module | Where input validation happens |
|--------|-------------------------------|
| **Admin** | Route validates input → passes clean typed input to use case |
| **Contacts** | Route validates input → passes to use case (correct) |
| **Manufacturers** | **Use case validates** (`validateUpdateManufacturerPrimarySectionInput` lives in application layer) — mixes route-level parsing with application orchestration |
| **Services** | Route validates input → passes to use case (correct) |

**Impact:** Per `ROUTE_POLICY.md` and `EXECUTION_ENGINE.md`, Step 4 (Input Validation) happens at the route before the application layer is called. Manufacturers leaks parsing into the use case.

---

## 3. Application Layer — create/update Use Cases Are Thin Pass-Throughs

| Module | Create use case logic | Update use case logic |
|--------|----------------------|----------------------|
| **Admin** | Validates governance rules → wraps in txn → creates → maps result | Fetches current → validates role transition → wraps in txn → updates → maps result |
| **Contacts** | **Just calls `createContactRecord(input)`** — no txn, no domain rules | **Just calls `updateContactRecord(id, input)`** — no txn, no domain rules |
| **Services** | Calls `createServiceRecord()` then `getServiceById()` — no txn | Calls `updateServiceRecord()` then re-fetches — no txn |
| **Manufacturers** | Normalizes name → checks uniqueness → creates (no txn) | Validates in use case → checks uniqueness → updates (no txn) |

**Issues:**
- **Contacts create/update** are pure pass-throughs with zero orchestration — they add no value over calling the repo directly. Per `APPLICATION.md`, use cases should orchestrate domain validation + data operations.
- **Services create/update** do a double-read pattern (create then re-fetch) instead of normalizing the write result — inefficient and not transactional.
- **Manufacturers create** does uniqueness checking but without a transaction, so a race condition exists between the check and the insert.

---

## 4. Domain Layer — Missing/Inconsistent Validation

| Module | Domain validation | Form validator |
|--------|------------------|----------------|
| **Admin** | Rich governance rules (pure predicates, permission computation) | N/A (role-based, not form-based) |
| **Contacts** | `validateContactForm()` returns error string or empty string | Returns string — **violates** docs ("validators throw AppError, never return error strings/booleans") |
| **Manufacturers** | `validateManufacturerForm()` returns error string or empty string | Same violation — returns string |
| **Services** | `validateServiceForm()` returns error string or empty string | Same violation |

**Impact:** `VALIDATION.md` explicitly says: _"Validators throw AppError on failure — never return error strings/booleans."_ All three modules violate this.

---

## 5. Domain Layer — Missing Uniqueness Rules in Contacts/Services

| Module | Uniqueness enforcement |
|--------|----------------------|
| **Manufacturers** | `normalizeManufacturerCompanyNameForUniqueness()` + `isManufacturerCompanyNameConflict()` + DB check in use case |
| **Contacts** | **None** — no name uniqueness check anywhere |
| **Services** | **None** — no name uniqueness check anywhere |

**Question:** Should contacts and services enforce name uniqueness? Manufacturers do. If not, this is fine — but it should be a deliberate decision.

---

## 6. API Routes — Inconsistent Authorization Patterns

| Module | Auth mechanism |
|--------|---------------|
| **Admin** | `applyRoutePolicy({ capability: "users.manage" })` — clean |
| **Contacts** | Mix of `authorizeContactsRoute()` (legacy) and `applyRoutePolicy()` |
| **Manufacturers** | Uses `applyRoutePolicy()` (migrated per execution report) |
| **Services** | Uses `authorizeServicesRoute()` — **legacy pattern, not migrated** |

**Impact:** The execution reports mention migrating from deprecated `authorize*Route` to `applyRoutePolicy()`. Services still uses the old pattern. Contacts may partially use it too.

---

## 7. API Routes — Missing GET Handler on `[id]/route.ts`

| Module | GET /api/{module}/[id] |
|--------|----------------------|
| **Admin** | Yes — returns single record |
| **Contacts** | **Missing** — no GET on `[id]/route.ts` |
| **Manufacturers** | **Missing** — no GET on `[id]/route.ts` |
| **Services** | **Missing** — no GET on `[id]/route.ts` |

**Impact:** Per `API_DESIGN.md`, the pattern is `GET /api/{resource}/[id]` for reading a single record. All three modules skip this — detail data is loaded server-side only. This works for now but means there's no client-side refetch path for the detail view.

---

## 8. Error Handling — Inconsistent Error Class Usage

| Module | Error class | Consistent usage? |
|--------|------------|-------------------|
| **Admin** | `GovernanceExecutionError` | Yes — all use cases throw it |
| **Contacts** | `ContactExecutionError` | Only in delete — create/update don't throw domain errors |
| **Manufacturers** | `ManufacturerExecutionError` | Used in all use cases |
| **Services** | `ServiceExecutionError` | Only in delete — create/update don't throw domain errors |

**Impact:** Contacts and Services create/update use cases have no error handling for domain violations because they're simple pass-throughs.

---

## 9. Testing Gaps

| Module | Route tests | Application tests | Domain tests | Form validation tests |
|--------|------------|-------------------|-------------|----------------------|
| **Admin** | Yes | Yes | Yes | N/A |
| **Contacts** | Yes | Yes (delete only) | Yes (delete rules) | Yes |
| **Manufacturers** | Yes | No standalone app tests | No standalone domain tests | Inline in route tests |
| **Services** | Yes | Yes (delete only) | No standalone domain tests | No |

**Gaps:**
- **Manufacturers** has no standalone application or domain test files — tests are mixed into route tests
- **Services** has no domain tests and no form validation tests
- **Contacts/Services** application tests only cover the delete use case (because create/update are trivial pass-throughs)

---

## 10. Module Structure — Missing `mutations.ts` Pattern Consistency

| Module | `mutations.ts` uses `withMutationMeta()`? |
|--------|------------------------------------------|
| **Admin** | Inline in controllers (not extracted to mutations.ts) |
| **Contacts** | Yes — extracted to `data/mutations.ts` |
| **Manufacturers** | Yes — extracted to `data/mutations.ts` |
| **Services** | Yes — extracted to `data/mutations.ts` (fixed in migration step 4.75) |

This is actually fine — the three modules are more consistent than admin here. Admin could be updated to match.

---

## 11. Data Layer — Normalizer Inconsistency

| Module | Normalizer handles null->empty string? | Returns counts? |
|--------|---------------------------------------|-----------------|
| **Admin** | Yes (dates to ISO) | No counts needed |
| **Contacts** | Yes + sums template/WO assignments into `assignmentsCount` | Yes |
| **Manufacturers** | Yes + includes `productsCount` | Yes |
| **Services** | Yes + includes `usageCount` | Yes |

All three are consistent here. No gap.

---

## Summary: Priority Gaps

### Critical (Architecture Violations)
1. **No transaction boundaries** on create/update in contacts, manufacturers, services
2. **Domain validators return strings** instead of throwing — violates `VALIDATION.md`
3. **Services still uses legacy `authorizeServicesRoute()`** — needs migration to `applyRoutePolicy()`

### Moderate (Structural Weaknesses)
4. **Contacts/Services create+update use cases are empty pass-throughs** — no domain rule enforcement, no error class usage
5. **Manufacturers leaks input validation into the application layer** instead of keeping it at the route boundary
6. **No GET `[id]` route** on any of the three modules (no client-side refetch path)

### Low (Test & Consistency Gaps)
7. **Manufacturers missing standalone application/domain tests**
8. **Services missing domain tests and form validation tests**
9. **Contacts application tests only cover delete**
