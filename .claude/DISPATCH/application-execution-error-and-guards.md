# application-execution-error-and-guards — Application-layer: converge the ExecutionError base, assertActorEmail, and Prisma error guards + delete a fossil use case

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/session-new` to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — those are the open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode:
   - PLAN mode → produce a plan and STOP for approval.
   - AUTO mode → execute the work.
   Either way, research-and-validate BEFORE acting.

## Intent for this session
Converge 22 hand-rolled, structurally identical `ExecutionError` subclasses onto ONE shared generic base (`packages/application/src/shared/execution-error.ts`), leaving each module a 1-line named subclass + its own `code` union so per-module `instanceof` stays intact. Extract the 38 copies of the actor-email opener guard into a shared `assertActorEmail(actorEmail, useCaseName)` helper, and add `isP2025`/`isP2003` guards beside the existing `isP2002` re-export so the 22 open-coded P2025 checks and 6 open-coded P2003 checks converge. Delete the zero-caller `listEntityTypeOptionsByIdsUseCase` fossil. "Done" = duplication gone with byte-identical runtime behavior + gauntlet green.

## ⚑ Flags — decisions to make / potential gaps

**Decisions**
- ⚑ **Shared base `this.name`.** The generic base can set `this.name = new.target.name`, which yields the concrete subclass's name automatically and keeps each module file a true 1-liner (`export class XExecutionError extends BaseExecutionError<XErrorCode> {}`). The alternative is an explicit per-subclass constructor that hard-sets `this.name`. VERIFY `new.target.name` reproduces each `this.name` from the table VERBATIM before committing to it.
- ⚑ **`invites` outlier.** `InviteExecutionError` today has NO `payload` field and an inline constructor signature. Simplest convergence = let it inherit the base's optional `payload` it never sets (a harmless superset) rather than narrowing the base. Decide: inherit (recommended) vs special-case.
- ⚑ **`isP2025`/`isP2003` home.** `isP2002`'s canonical definition lives in `packages/db` (OUT OF BOUNDS for this slice); application only re-exports it. Two options: (i) add the new guards to `packages/db` and re-export — touches out-of-bounds code; (ii) DEFINE `isP2025`/`isP2003` directly in `packages/application/src/shared/prisma-errors.ts` (in-bounds; application use cases already import `Prisma`). Given the slice is scoped to `packages/application`, option (ii) is the in-bounds choice — decide explicitly and note the small asymmetry (isP2002 re-exported from db, isP2025/isP2003 locally defined).
- ⚑ **Lookup-CRUD factory (defer/drop recommended).** Tempting to factory the 3 near-identical lookup CRUD surfaces (entity-types / payment-purposes / job-types), but their error surfaces are NOT uniform (entity-types has no `NAME_CONFLICT` code) and a factory would fight the per-module code unions. Pressure-test says SKIP. Confirm defer/drop.
- ⚑ **`assertActorEmail` signature.** `assertActorEmail(actorEmail, useCaseName)` throwing ``new Error(`${useCaseName} requires a non-empty actorEmail`)``. Every message MUST stay byte-identical (only the leading function-name string varies today) and MUST keep the substring `actorEmail` — tests assert `/actorEmail/`.

**Gaps (CRITICAL — read before writing)**
- ⚑ **The API does NOT switch on `this.name` or `instanceof ExecutionError`.** The real central mapper `apps/web/server/http/api-helpers.ts:109` `normalizePrismaError` is STRUCTURAL / duck-typed: `error instanceof Error && "status" in error` with a numeric status in 400–499 → it reads `.status` / `.message` / `.field` / `.payload`. It NEVER reads `.name` or `.code`. (Corroborated by `app-errors.ts:22` `isAppError` checking `"field" in error || "status" in error`.) So the true runtime contract to preserve is: each thrown object stays `instanceof Error`, carries a numeric `.status` in 400–499, and exposes `.message` / `.field` / `.payload`. The generic base trivially preserves all of this — but do NOT assume name/code drives the API.
- ⚑ **`.code` is NOT read by the API.** The `errorCode={result.error.code}` hits in dashboard pages are a DIFFERENT code (a loader `PrismaDetailPageResult` code like `WORK_ORDERS_LIST_LOAD_FAILED`), not the ExecutionError union. `.code` is load-bearing ONLY for TS exhaustiveness at throw sites + unit-test `toMatchObject` — both satisfied by preserving each union verbatim. `.name` is load-bearing for nothing at runtime.
- ⚑ **`instanceof` IS load-bearing in TESTS (not the API).** `tests/entities/create-entity.test.ts:93` and `tests/job-types/create-job-type.test.ts:102` assert `.rejects.not.toBeInstanceOf(JobTypeExecutionError)`. A single shared class would break these — each module MUST keep its own named exported subclass. The 1-subclass-per-module plan is correct and required.
- ⚑ **`create-property-hub.ts:118` P2025 guard is MULTI-LINE** (`code === "P2025"` on its own line). A naive single-line regex rewrite will MISS it — convert it by hand.
- ⚑ **`packages/db` is out of bounds but is `isP2002`'s canonical home.** Reconcile with the `isP2025`/`isP2003` home decision above before writing the new guards.

## Scope
In:
1. Converge the 22 `errors.ts` subclasses onto a shared generic base in `packages/application/src/shared/execution-error.ts` (each module keeps a 1-line named subclass + code union).
2. Extract `assertActorEmail` (38 opener sites) into a shared helper under `packages/application/src/shared/`.
3. Add `isP2025` + `isP2003` guards to `packages/application/src/shared/prisma-errors.ts` and converge the 22 open-coded P2025 + 6 open-coded P2003 checks onto them.
4. Delete the `listEntityTypeOptionsByIdsUseCase` fossil (0 callers) and its 2 now-orphaned imports.

Out:
- Anything outside `packages/application/src`.
- `packages/db` is explicitly OUT OF SCOPE — even though `isP2002`'s canonical `isP2002(error, targetColumn?)` source lives there. The new `isP2025`/`isP2003` guards go in application's OWN `shared/prisma-errors.ts`, not in db.
- `@builders/domain` (products' `ProductExecutionError` source) is out of scope — `products/errors.ts` stays a 1-line re-export, untouched.
- No factory abstraction over the lookup CRUD modules (see flag).

## Files you own (do not edit anything outside this list)
All paths relative to `packages/application/src/` unless noted.

**New shared files (create):**
- `shared/execution-error.ts` — the generic `BaseExecutionError<TCode extends string>`.
- `shared/prisma-errors.ts` — ALREADY EXISTS (line 1 re-exports `isP2002` from `@builders/db`); ADD `isP2025` + `isP2003` here.
- `shared/` — home for `assertActorEmail` (new file, e.g. `shared/assert-actor-email.ts`; confirm the shared dir's barrel convention while researching).

**The 22 module `errors.ts` (rewrite each to a 1-line subclass + code union — preserve `this.name` + code members VERBATIM):**
- `certificates/errors.ts`, `entities/errors.ts`, `entity-types/errors.ts`, `imports/errors.ts`, `imports/staged-inventory-rows/errors.ts`, `imports/staged-inventory-section/errors.ts`, `inventory/adjustments/errors.ts`, `inventory/errors.ts`, `invites/errors.ts` (OUTLIER — see flag), `job-types/errors.ts`, `payment-purposes/errors.ts`, `payments/errors.ts`, `products/indicators/errors.ts`, `properties/errors.ts`, `templates/errors.ts`, `templates/planned-payments/errors.ts`, `templates/planned-products/errors.ts`, `users/errors.ts`, `warehouses/errors.ts`, `work-orders/errors.ts`, `work-orders/material-items/errors.ts`, `work-orders/planned-payments/errors.ts`.
- (NOT `products/errors.ts` — that's a re-export from `@builders/domain`, out of scope.)

**The 38 use-case opener sites (swap the inline plain-Error guard for `assertActorEmail`):** see the assertActorEmail list in the layer map.

**The 28 Prisma-guard sites (22 P2025 + 6 P2003 — swap open-coded check for `isP2025`/`isP2003`):** see the P2025/P2003 lists in the layer map.

**The fossil:**
- `entity-types/list-entity-types.ts` — delete `listEntityTypeOptionsByIdsUseCase` (lines 47–53) + its 2 orphaned imports.
- `entity-types/index.ts` — remove the barrel export at line 15.

**Tests (~40 files under `packages/application/tests/`):** expect to run them; edit only if a test's OWN local stub needs it (see Done means — the refactor should NOT require test edits if names + `.code`/`.status` shapes hold).

## Layer-by-layer map

### Work item 1 — ExecutionError generic base (22 subclasses)
PRECEDENT: `products/errors.ts:1` is already a 1-line re-export (`export { ProductExecutionError, type ProductErrorCode } from "@builders/domain"`) — products' source lives in `@builders/domain` (out of bounds). The analog for this sweep: `shared/execution-error.ts` owns the generic base; each module's `errors.ts` keeps a thin named subclass + code union.

All 22 are structurally identical today: `readonly code:<T>; readonly status:number; readonly field?:string; readonly payload?:Record<string,unknown>`, single object-arg constructor, `super(input.message)`, `this.name="<ClassName>"`, 4 field assignments. Preserve each `this.name` + code union VERBATIM.

Base shape (decision 1): `BaseExecutionError<TCode extends string> extends Error` with `code: TCode; status: number; field?: string; payload?: Record<string, unknown>`, single object-arg constructor, `super(input.message)`, `this.name = new.target.name` (VERIFY), 4 assignments. Each module file becomes:
`export type XErrorCode = "..." | "...";` + `export class XExecutionError extends BaseExecutionError<XErrorCode> {}`.

The 22 (file:line — `this.name` — code members):

| # | file:line | this.name | code members |
|---|-----------|-----------|--------------|
| 1 | `certificates/errors.ts:7` | CertificateExecutionError | CERTIFICATE_VALIDATION_FAILED, CERTIFICATE_NOT_FOUND, CERTIFICATE_FILE_NOT_FOUND, CERTIFICATE_FILE_VALIDATION_FAILED |
| 2 | `entities/errors.ts:6` | EntityExecutionError | ENTITY_VALIDATION_FAILED, ENTITY_NOT_FOUND, ENTITY_INVALID_TYPE |
| 3 | `entity-types/errors.ts:3` | EntityTypeExecutionError | ENTITY_TYPE_VALIDATION_FAILED, ENTITY_TYPE_NOT_FOUND |
| 4 | `imports/errors.ts:9` | ImportExecutionError | IMPORT_VALIDATION_FAILED, IMPORT_NOT_FOUND, IMPORT_ENTITY_NOT_FOUND, IMPORT_WAREHOUSE_NOT_FOUND, IMPORT_DELETE_BLOCKED_BY_INVENTORY, IMPORT_WAREHOUSE_CHANGE_BLOCKED_BY_INVENTORY |
| 5 | `imports/staged-inventory-rows/errors.ts:9` | StagedInventoryExecutionError | STAGED_VALIDATION_FAILED, STAGED_PARENT_NOT_FOUND, STAGED_STALE_ROW_VERSION, STAGED_BATCH_INELIGIBLE, STAGED_BATCH_RACE, STAGED_MATERIALIZE_PRECONDITION_FAILED |
| 6 | `imports/staged-inventory-section/errors.ts:8` | ImportStagedInventorySectionExecutionError | SECTION_PARENT_NOT_FOUND, SECTION_FILTER_VALIDATION_FAILED, SECTION_ROW_VALIDATION_FAILED, SECTION_ROW_DIFF_VALIDATION_FAILED, SECTION_UNIT_VALIDATION_FAILED |
| 7 | `inventory/adjustments/errors.ts:9` | InventoryAdjustmentExecutionError | INVENTORY_ADJUSTMENT_VALIDATION_FAILED, INVENTORY_ADJUSTMENT_NOT_FOUND, INVENTORY_ADJUSTMENT_SCOPE_MISMATCH, INVENTORY_ADJUSTMENT_STALE, INVENTORY_ADJUSTMENT_EXCEEDS_INVENTORY, INVENTORY_ADJUSTMENT_WAREHOUSE_INVENTORY_MISMATCH |
| 8 | `inventory/errors.ts:11` | InventoryExecutionError | INVENTORY_VALIDATION_FAILED, INVENTORY_NOT_FOUND, INVENTORY_IN_USE, INVENTORY_PRODUCT_NOT_FOUND, INVENTORY_UNIT_NOT_FOUND, INVENTORY_WAREHOUSE_NOT_FOUND, INVENTORY_LOCATION_NOT_FOUND, INVENTORY_LOCATION_WAREHOUSE_MISMATCH |
| 9 | `invites/errors.ts:6` | InviteExecutionError | INVITE_NOT_AUTHORIZED, INVITE_FORBIDDEN_RANK, INVITE_VALIDATION_FAILED — **OUTLIER: NO `payload` field, inline constructor signature** |
| 10 | `job-types/errors.ts:6` | JobTypeExecutionError | JOB_TYPE_VALIDATION_FAILED, JOB_TYPE_NOT_FOUND, JOB_TYPE_NAME_CONFLICT |
| 11 | `payment-purposes/errors.ts:6` | PaymentPurposeExecutionError | PAYMENT_PURPOSE_VALIDATION_FAILED, PAYMENT_PURPOSE_NOT_FOUND, PAYMENT_PURPOSE_NAME_CONFLICT |
| 12 | `payments/errors.ts:6` | PaymentExecutionError | PAYMENT_VALIDATION_FAILED, PAYMENT_NOT_FOUND, PAYMENT_LINK_INVALID |
| 13 | `products/indicators/errors.ts:11` | InventoryIndicatorExecutionError | INVENTORY_INDICATOR_VALIDATION_FAILED, INVENTORY_INDICATOR_NOT_FOUND, INVENTORY_INDICATOR_SCOPE_MISMATCH, INVENTORY_INDICATOR_STALE, INVENTORY_INDICATOR_DUPLICATE, INVENTORY_INDICATOR_PRODUCT_NOT_FOUND, INVENTORY_INDICATOR_WAREHOUSE_NOT_FOUND, INVENTORY_INDICATOR_UNIT_NOT_FOUND |
| 14 | `properties/errors.ts:6` | PropertyExecutionError | PROPERTY_VALIDATION_FAILED, PROPERTY_NOT_FOUND, PROPERTY_IN_USE |
| 15 | `templates/errors.ts:5` | TemplateExecutionError | TEMPLATE_VALIDATION_FAILED, TEMPLATE_NOT_FOUND |
| 16 | `templates/planned-payments/errors.ts:5` | TemplatePlannedPaymentExecutionError | TEMPLATE_PLANNED_PAYMENT_VALIDATION_FAILED, TEMPLATE_PLANNED_PAYMENT_LINK_INVALID |
| 17 | `templates/planned-products/errors.ts:4` | TemplatePlannedProductExecutionError | TEMPLATE_PLANNED_PRODUCT_VALIDATION_FAILED (single-member) |
| 18 | `users/errors.ts:9` | UserExecutionError | USER_VALIDATION_FAILED, USER_NOT_FOUND, USER_CONFLICT, USER_FORBIDDEN_RANK, USER_NOT_AUTHORIZED, USER_SELF_DELETE |
| 19 | `warehouses/errors.ts:7` | WarehouseExecutionError | WAREHOUSE_VALIDATION_FAILED, WAREHOUSE_NOT_FOUND, WAREHOUSE_IN_USE, WAREHOUSE_NAME_CONFLICT |
| 20 | `work-orders/errors.ts:8` | WorkOrderExecutionError | WORK_ORDER_VALIDATION_FAILED, WORK_ORDER_NOT_FOUND, WORK_ORDER_INVENTORY_ADJUSTMENT_WRITE_FAILED, TEMPLATE_SYNC_TEMPLATE_NOT_FOUND, TEMPLATE_SYNC_TEMPLATE_INVALID |
| 21 | `work-orders/material-items/errors.ts:4` | WorkOrderMaterialItemExecutionError | WORK_ORDER_MATERIAL_ITEM_VALIDATION_FAILED (single-member) |
| 22 | `work-orders/planned-payments/errors.ts:5` | WorkOrderPlannedPaymentExecutionError | WORK_ORDER_PLANNED_PAYMENT_VALIDATION_FAILED, WORK_ORDER_PLANNED_PAYMENT_LINK_INVALID |

(#7, #8, #13 code members abbreviated with the shared prefix in the source — RE-READ each file and copy the full literal union VERBATIM; do not trust the expansions above over the code.)

### Work item 2 — assertActorEmail (38 sites)
All 38 throw a PLAIN `Error` today (never a module ExecutionError): ``throw new Error(`<useCaseName> requires a non-empty actorEmail`)``. Only the leading function-name string varies. Replace each with ``assertActorEmail(actorEmail, "<useCaseName>")``. Helper: ``export function assertActorEmail(actorEmail, useCaseName) { ... throw new Error(`${useCaseName} requires a non-empty actorEmail`) }`` — MUST keep the substring `actorEmail` (tests assert `/actorEmail/`). Match the existing empty/whitespace check verbatim while researching.

The 38 opener sites (path:line, relative to `packages/application/src/`):
- `certificates/create-certificate.ts:11`
- `certificates/update-certificate.ts:16`
- `certificates/upload-certificate-file.ts:43` — **NOTE: this file has the plain-Error actorEmail opener HERE AND a separate `CertificateExecutionError` throw later (P2025 at :78). Convert ONLY the :43 opener; don't conflate.**
- `entities/create-entity.ts:17`
- `entities/update-entity.ts:19`
- `entity-types/create-entity-type.ts:11`
- `entity-types/update-entity-type.ts:15`
- `imports/create-import.ts:22`
- `imports/update-import.ts:42`
- `imports/staged-inventory-section/save-import-staged-inventory-section.ts:46`
- `inventory/create-inventory.ts:23`
- `inventory/update-inventory.ts:23`
- `inventory/adjustments/create-adjustment.ts:37`
- `inventory/adjustments/update-adjustment.ts:30`
- `job-types/create-job-type.ts:15`
- `job-types/update-job-type.ts:17`
- `payment-purposes/create-payment-purpose.ts:18`
- `payment-purposes/update-payment-purpose.ts:20`
- `payments/create-payment.ts:11`
- `payments/update-payment.ts:12`
- `products/create-product.ts:21`
- `products/update-product.ts:23`
- `products/indicators/create-indicator.ts:23`
- `products/indicators/save-indicators-section.ts:40`
- `properties/create-property.ts:11`
- `properties/update-property.ts:16`
- `properties/create-property-hub.ts:95`
- `templates/create-template.ts:11`
- `templates/update-template.ts:15`
- `templates/planned-payments/save-template-planned-payments-section.ts:22`
- `templates/planned-products/save-template-planned-products-section.ts:24`
- `warehouses/create-warehouse.ts:16`
- `warehouses/update-warehouse.ts:18`
- `work-orders/create-work-order.ts:13`
- `work-orders/update-work-order.ts:22`
- `work-orders/sync-template-to-work-order.ts:34`
- `work-orders/material-items/save-work-order-material-items-section.ts:43`
- `work-orders/planned-payments/save-work-order-planned-payments-section.ts:22`

### Work item 3 — isP2025 + isP2003 guards
`isP2002` canonical home: `packages/db/src/shared/prisma-errors.ts:3` `export function isP2002(error, targetColumn?)`. Application re-exports it: `packages/application/src/shared/prisma-errors.ts:1` `export { isP2002 } from "@builders/db"`. NO `isP2025`/`isP2003` exist anywhere today. Because `packages/db` is OUT OF BOUNDS, DEFINE `isP2025`/`isP2003` directly in `packages/application/src/shared/prisma-errors.ts` (application use cases already import `Prisma`) — see flag.

Open-coded **P2025** — 22 sites, pattern `error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025"` (relative to `packages/application/src/`):
- `payments/delete-payment.ts:15`
- `payments/update-payment.ts:47`
- `work-orders/update-work-order.ts:33`
- `work-orders/delete-work-order.ts:21`
- `work-orders/sync-template-to-work-order.ts:44`
- `payment-purposes/update-payment-purpose.ts:47`
- `payment-purposes/delete-payment-purpose.ts:15`
- `entity-types/delete-entity-type.ts:15`
- `entity-types/update-entity-type.ts:34`
- `certificates/upload-certificate-file.ts:78`
- `certificates/update-certificate.ts:35`
- `certificates/delete-certificate.ts:29`
- `job-types/update-job-type.ts:44`
- `job-types/delete-job-type.ts:15`
- `properties/create-property-hub.ts:118` — **MULTI-LINE variant (`code === "P2025"` on its own line) — convert by hand; a single-line regex will miss it.**
- `properties/delete-property.ts:35`
- `properties/update-property.ts:35`
- `users/delete-user.ts:75`
- `templates/delete-template.ts:15`
- `templates/update-template.ts:36`
- `entities/delete-entity.ts:19`
- `entities/update-entity.ts:38`

Open-coded **P2003** — 6 sites:
- `payments/create-payment.ts:57`
- `payments/update-payment.ts:55`
- `work-orders/planned-payments/save-work-order-planned-payments-section.ts:73`
- `templates/planned-payments/save-template-planned-payments-section.ts:73`
- `entities/create-entity.ts:40`
- `entities/update-entity.ts:46`

### Work item 4 — delete the listEntityTypeOptionsByIdsUseCase fossil
- Definition: `entity-types/list-entity-types.ts:47-53`. 0 callers (grep returns only the definition line). Exported via barrel `entity-types/index.ts:15` but unused → remove that export line too.
- Remove the 2 orphaned imports used ONLY inside this fn: `normalizeIdFilter` (from `@builders/domain`, `list-entity-types.ts:4`, used at line 50) and `listEntityTypeOptionsByIds` (from `@builders/db`, `list-entity-types.ts:9`, used at line 52).
- **DO NOT remove `EntityTypeOption`** (`list-entity-types.ts:6`) — still used by `searchEntityTypeOptionsUseCase` at lines 49 & 62.
- **KEEP (built-ahead, 0 callers but intentional):** `payment-purposes/list-payment-purposes.ts` — `listPaymentPurposeOptionsByIdsUseCase:48` and `searchPaymentPurposeOptionsUseCase:70`. Do NOT delete these.

### Tests to keep green (~40 files under `packages/application/tests/`)
Contract pins the refactor must NOT break:
- `instanceof` matters: `tests/entities/create-entity.test.ts:93` and `tests/job-types/create-job-type.test.ts:102` assert `.rejects.not.toBeInstanceOf(JobTypeExecutionError)` → each module MUST keep its own named exported subclass; a single shared class breaks these.
- `.code` + `.status` via `toMatchObject` throughout → preserve every union + status verbatim.
- actorEmail message via `.rejects.toThrowError(/actorEmail/)` (`create-entity.test.ts:56`, `create-warehouse.test.ts:79`, `create-job-type.test.ts:65`).
- Tests define their OWN local `ExecutionError`/`isP2002` stubs, so the shared-helper refactors won't fight them as long as public class names + `.code`/`.status` shapes hold — expect NO test edits.

## Migration (if schema changes)
None — no schema change.

## Done means
- `/check-gauntlet` green (build + typecheck + lint + test)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
