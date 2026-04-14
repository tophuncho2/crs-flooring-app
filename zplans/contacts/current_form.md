**Contacts hardening — full sequence:**

**Step 1 + 2: Route policy migration + capability sweep** (1 commit)
- GET migrated from legacy `authorizeContactsRoute()` → `applyRoutePolicy({ toolSlug })`
- POST/PATCH/DELETE gained `capability: "system.access"`
- Test mocks switched from `authorizeContactsRoute` → `applyRoutePolicy`
- Fixed mock lie (`CONTACTS_TOOL_SLUG: "contacts"` → `"warehouse"`)
- Legacy helper preserved for services/management-companies

**Step 3: parseUuidParam on DELETE** (1 commit)
- Added `parseUuidParam(rawId, "id")` to DELETE handler
- Test fixtures updated `contact-1` → real UUID

**Step 4: Extract validators + collapse input type + typed error codes** (1 commit)
- New `apps/web/app/api/contacts/_validators.ts` with `validateContactInput()`
- Throws `ContactExecutionError` directly (inline parsing, not `parseRequiredString`)
- Collapsed `CreateContactInput` + `UpdateContactInput` → unified `ContactInput`
- Introduced `ContactErrorCode` union: `CONTACT_VALIDATION_FAILED | CONTACT_NOT_FOUND | CONTACT_IN_USE`
- `ContactExecutionError.code` typed as `ContactErrorCode` instead of bare string
- Removed duplicated `parseContactType` from both route files
- Domain `validateContactType` retained (still used by validator + form hook)
- Domain `validateContactForm` retained (pure predicate, legitimately used by client hook)

**Step 5: withDatabaseTransaction + optional client parameter** (1 commit)
- All three use cases wrapped in `withDatabaseTransaction`
- Each accepts `client?: Prisma.TransactionClient` with canonical `const c = client ?? tx`
- Enables future bulk operations
- No uniqueness pre-check, no P2002 catch (contacts has no unique column)

**Step 6: ContactErrorCode union** → folded into step 4 (discovered `delete-contact.ts` already threw two codes)

**Step 7: Split PATCH into section route + round-trip elimination** (1 commit, biggest lift)
- NEW `apps/web/app/api/contacts/[id]/primary/section/route.ts`
- Scopes: `contacts.primary.section.replace` (rate limit + receipt + telemetry)
- Route consumes `updateContactUseCase` result directly — eliminated redundant post-use-case `getContactById` re-read
- `[id]/route.ts` reduced to DELETE-only
- `updateContactRequest` helper URL: `/api/contacts/${id}` → `/api/contacts/${id}/primary/section`
- NEW `contacts-primary-section-route.test.ts` with 3 tests (snapshot, stale revision, validation failure)
- `contacts-routes.test.ts` PATCH tests removed, combined test renamed `"POST and DELETE mutate..."`

**Step 7.5: Dead mock cleanup** (tiny follow-up commit)
- Removed unused `updateContactUseCaseMock` from `contacts-routes.test.ts` (3 lines)

**Step 8 + 9: Data layer module alignment** (1 commit, collapsed)
- `modules/contacts/data/queries.ts` stripped to 2 exports: `getContactsPageData`, `getContactDetailPageData`
- Unwrapped `PrismaPageDataResult<{ contacts: ContactRecord[] }>` → `PrismaPageDataResult<ContactRecord[]>`
- Unwrapped `PrismaDetailPageResult<{ contact: ContactRecord }>` → `PrismaDetailPageResult<ContactRecord>`
- Deleted pass-through wrappers (`listContacts`, `getContactById`, `listSalesRepContactOptions`) and `ContactRecord` re-export
- Routes switched to `@builders/db` direct imports
- Server Components updated: `result.data.contacts` → `result.data`, `result.data.contact` → `result.data`
- Test mocks: `@/modules/contacts/data/queries` → `@builders/db` via `vi.importActual` spread pattern

**Schema verification:** `@@index([name])` and `@@index([type])` already present on `FlooringContact`. No change needed.

**Deferred:**
- Uniqueness tuple decision (Linear issue — `name` vs `(nameNormalized, type)` vs none)
- List view engine scale work (separate epic, post-hardening sweep)

**Final state:** 6 commits. 18 tests passing across 5 test files. Contacts module structurally mirrors manufacturers.