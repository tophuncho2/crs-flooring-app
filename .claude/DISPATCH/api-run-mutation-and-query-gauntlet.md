# api-run-mutation-and-query-gauntlet — API-layer: converge the route gauntlet into runMutation/runQuery + fold minRank into RoutePolicy + delete dead routes/validators/helpers

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/session-new` to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — those are the open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode:
   - PLAN mode → produce a plan and STOP for approval.
   - AUTO mode → execute the work.
   Either way, research-and-validate BEFORE acting. Given this slice's blast radius, PLAN-then-approve is strongly advised even in auto mode.

## Intent for this session
Converge the repeated 9-step mutation gauntlet into a shared `runMutation` (59 handlers) and the near-identical query bodies into a shared `runQuery` (~40 handlers), fold the repeated 2-line rank block into `RoutePolicy` (33 sites), extract the per-module validator factories (`fail`/`requireString`/`requireColor`/`parseQuery`/`optionsQuerySchema`), and delete the dead form-options route, 7 export-only error classes, 4 dead api-helpers, and 2 false `@deprecated` banners. "Done" = duplication gone with **byte-identical runtime behavior** (status codes, idempotency hashes, telemetry meta) + gauntlet green. This is the largest, highest-blast-radius slice (~2,000 LOC) and its automated test net is thin — stage it in independently-reviewable passes and add route-level tests first.

## ⚑ Flags — decisions to make / potential gaps

⚑ **Sequencing (STRONGLY recommended — settle first).** Do dead-code-first: delete the form-options route, drop the 4 dead helpers, un-export the 7 error classes, strip the 2 banners. Zero-risk, shrinks the surface. THEN stage the wrappers as SEPARATE, independently-reviewable + revertable passes: (1) minRank→RoutePolicy fold, (2) `runQuery` on the ~40 query handlers, (3) `runMutation` on the 59 mutation handlers, (4) validator factory extraction (`parseQuery`/`optionsQuerySchema`/`fail`/`requireString`/`requireColor`). Do NOT land this as one mega-commit.

⚑ **Thin test net = silent drift risk (READ THIS).** Only 3-4 tests touch this layer at all: `apps/web/tests/server/http/route-helpers.test.ts` (the file whose banners/exports change), `apps/web/tests/server/auth/route-auth.test.ts` (tests `enforceRankAtLeast`+`enforceManageUsersAccess` directly at :59-80 — the minRank fold changes the caller contract these validate), `apps/web/tests/modules/unit-of-measures/unit-of-measures-routes.test.ts` (the ONLY e2e route test, and it targets a module whose 2 error classes are on the dead list), and `apps/web/tests/modules/templates/planned-products-validator.test.ts` (validator-level). Of 65 total test files, ~61 test use-cases/engines/modules, NOT route handlers. Refactoring 59+40 handlers has almost NO regression net at the route layer — behavioral drift (rank ordering, snapshot key, status code, idempotency hash) will ship SILENTLY. **Add `runMutation`/`runQuery` unit tests + a few representative POST/PATCH/DELETE route integration tests BEFORE migrating any handlers.**

⚑ **`runMutation` signature + escape-hatch shape.** Thread `{scope, route, rateLimit preset, rankMin?, parseInput, useCase, buildResponseBody, telemetry meta, status}` plus PATCH/DELETE hatches `{requireExpectedUpdatedAt, loadSnapshot(id), snapshotKey, conflictMessage}`. Decide: `loadSnapshot`+`assertExpectedUpdatedAt` as a first-class option on ONE `runMutation` (recommended — an optional `concurrency:{loadSnapshot,snapshotKey,message}` block, since the assert-before-reserve ordering is an invariant) vs separate `runSectionMutation`/`runDeleteMutation` variants.

⚑ **Fold minRank into RoutePolicy.** Add `minRank?: UserRank` to the `RoutePolicy` type (route-policy.ts:18); `applyRoutePolicy` calls `enforceRankAtLeast` immediately after `requireRouteAccess` and BEFORE rate-limit (:97-107). Decide how the `enforceManageUsersAccess` sites (invites, users/[id]/rank) express their rank via the same field (`USER_MANAGEMENT_MIN_RANK`).

⚑ **Ordering foot-gun the minRank fold closes.** Today `enforceRankAtLeast` runs AFTER `applyRoutePolicy` on mutations — so on POST/DELETE the rate-limit token is consumed BEFORE the rank check (an under-ranked caller drains the bucket and can 429 before the correct 403). Ordering is also INCONSISTENT: on GET the rank check sits BETWEEN `applyRoutePolicy` and `enforceQueryRateLimit` (job-types/route.ts:26 vs :52). Folding `minRank` into `RoutePolicy` makes rank fire right after auth, before rate-limit, uniformly. This is a (small) behavior change — confirm it's intended.

⚑ **Validator factory home.** New `apps/web/app/api/_shared/validators.ts` (colocated with the per-module `_validators.ts`) vs `apps/web/server/http/`. The `fail` factory MUST stay parametrized by each module's own `*ExecutionError` (precedent: work-orders/_validators.ts:61 already has a parametrized `requireString(value, field, fail)` — the natural target signature).

⚑ **Handlers that DON'T fit the canonical shape (audit each).**
- File upload — `certificates/[id]/files/route.ts` reads `formData()` at :43, pulls `idempotencyKey` from the multipart body at :45, uses UPLOAD bucket, and CANNOT use `parseMutationEnvelope` (its own comment at :23). `runMutation` needs a "body already parsed / non-JSON envelope" mode, or this stays hand-rolled.
- CSV export POSTs — `work-orders/export`, `adjustments/export`, `inventory/export` are POST but read-only, EXPORT bucket, no receipt/telemetry, return `routeCsv`. OUT of the `runMutation` set (already excluded from the 59).
- Special-auth mutations — `users/[id]/rank`, `invites`, `invites/[id]` use `enforceManageUsersAccess` not `enforceRankAtLeast`; `invites/[id]` uses an identity parser `(value)=>value` at :58. Fold into minRank only if RoutePolicy accepts a user-management rank.
- Action routes — `templates/[id]/sync-to-work-order`, `work-orders/from-template`, `imports/[id]/staged-inventory-rows/mark-for-import`, `products/[id]/indicators`, `properties/hub` (POST): verify each fits the standard envelope (some may have no `expectedUpdatedAt` / bespoke response / different telemetry entityType).
- Detail GETs — the 14 `[id]/route.ts` throw a module `*ExecutionError` NOT-FOUND (job-types/[id]/route.ts:37), not the options/list `fail` path. `runQuery` covers list/options/search cleanly, but detail reads are a slightly different sub-shape (param parse + not-found throw). Decide whether they're in `runQuery` scope.
- `auth/[...all]`, `health` — not gauntlet routes; leave untouched.

⚑ **Telemetry / idempotency variance (preserve replay compat).** `entityType` strings differ per module; some handlers pass `entityId` (PATCH/DELETE) while POST does not (job-types/route.ts:74 has NO entityId; [id]/route.ts:94 HAS it). `runMutation` telemetry meta must be a per-call object, NOT derived. Idempotency scope strings are hand-authored per handler (`"jobTypes.create"`, `"jobTypes.primary.section.replace"`) and feed the receipt hash — pass them through VERBATIM to preserve replay compat with in-flight receipts.

## Scope
**In:**
- Converge the 9-step mutation gauntlet → shared `runMutation` (59 handlers).
- Converge the near-identical query bodies → shared `runQuery` (~40 handlers).
- Fold the repeated 2-line rank block → `minRank` on `RoutePolicy` (33 call sites / 20 files).
- Extract validator factories: `fail`, `requireString`, `requireColor`, `parseQuery`, and the shared `optionsQuerySchema`.
- Delete dead code: the `products/form-options` route, 7 export-only validator error classes, 4 dead `api-helpers.ts` helpers, 2 false `@deprecated` banners.

**Out:**
- Anything outside `apps/web/app/api` and `apps/web/server/http`.
- The `inventory/[id]/balances` route — explicitly excluded (handled separately).
- ALL `packages/**` files. In particular `getProductFormOptions` (packages/db/src/products/read-repository.ts:336) is a LIVE SSR loader consumed at apps/web/modules/products/data/queries.ts:4,21,41 — it MUST stay. Only the route is dead; do NOT touch the use case or anything in `packages/db`.

## Files you own (do not edit anything outside this list)

**Shared HTTP layer — `apps/web/server/http/` (where `runMutation`/`runQuery` land):**
- `route-policy.ts` — home for the minRank fold + likely home for `runMutation` orchestration. Landmarks: `RoutePolicy` type:18, `buildMutationRequestHash`:56, `enforceQueryRateLimit`:81, `applyRoutePolicy`:93, `parseMutationEnvelope`:125, `assertExpectedUpdatedAt`:158, `enforceMutationReceipt`:178, P2002 receipt-race:224, `finalizeMutationReceipt`:252.
- `route-helpers.ts` — `requireRouteAccess`:18 (banner :14-17), `enforceRouteRateLimit`:28 (banner :24-27), `routeJson`:51, `routeCsv`:61, `routeError`:76.
- `api-helpers.ts` — `parseRequiredString`, `parseUuidParam`, `parseOptionalString`, `normalizePrismaError`:109 (KEEP — live). Dead helpers to delete: `parseOptionalStateAbbreviation`:48, `parseBoolean`:70, `parseDecimal`:77, `parseDecimalOrDefault`:96.
- `app-errors.ts` — `createAppError`/`isAppError` (reference only).
- `rate-limit-presets.ts` — `CRUD_CREATE`, `CRUD_DELETE`, `CRUD_UPDATE_SECTION`, `QUERY_DEFAULT`, `EXPORT`, `UPLOAD` (reference only).

**Auth + telemetry seams (reference; do NOT change their internals, only their callers):**
- `apps/web/server/auth/route-auth.ts` — `authorizeRouteAccess`:12, `enforceRankAtLeast`:34, `enforceManageUsersAccess`:49.
- `apps/web/server/telemetry/mutation-telemetry.ts` — `withMutationTelemetry`:4.

**Route handlers — `apps/web/app/api/**/route.ts`:** the 59 mutation handlers, ~40 query handlers, and 33 rank sites (see map). Exemplars: `job-types/route.ts`, `job-types/[id]/route.ts`, `job-types/[id]/primary/section/route.ts`, `categories/options/route.ts`. DELETE `apps/web/app/api/products/form-options/route.ts`.

**Validators — `apps/web/app/api/**/_validators.ts`:** the 36 `parseQuery` copies, 10 `*OptionsQuerySchema`, 21 `fail` variants, 11 `requireColor`, 9 `requireString`, and the 7 dead error classes.

**New file you may create:** `apps/web/app/api/_shared/validators.ts` (validator factory home — see flag).

## Layer-by-layer map

**API — grouped by work item.**

### 1. runMutation (59 handlers)
Canonical 9-step gauntlet, representative POST at `apps/web/app/api/job-types/route.ts:42-91`:
1. rate-limit+auth — `applyRoutePolicy(request,{rateLimit:{...CRUD_CREATE,scope,route}})`:43
2. rank gate — `enforceRankAtLeast(access, ELEVATED_MODULE_MIN_RANK)`:52 (the 2-line block to fold away)
3. parse body — `await request.json()`:56
4. envelope+validate — `parseMutationEnvelope(body, validateCreateJobTypeInput)`:57 → `{input, mutation}`
5. idempotency — `enforceMutationReceipt({scope,request,access,mutation,body})`:59; `if(receipt.replay) return receipt.replay`
6. telemetry-wrapped use-case — `withMutationTelemetry(access,{...},()=>createJobTypeUseCase(input, access.user.email))`:68
7. build response body — :79
8. finalize receipt — `finalizeMutationReceipt({scope,access,mutation,responseStatus,responseBody})`:80
9. return — `routeJson(access, responseBody, {status:201})`:87; single `catch → routeError`:88

Variants + escape hatches `runMutation` must support:
- **POST (create)** — job-types/route.ts:42 — no `expectedUpdatedAt`, status 201, no snapshot.
- **PATCH (section)** — job-types/[id]/primary/section/route.ts:22 — `parseUuidParam` on `[id]`:37; `parseMutationEnvelope(..., {requireExpectedUpdatedAt:true})`:39; `loadSnapshot = getJobTypeById(id)` from `@builders/db`:43; `assertExpectedUpdatedAt({actualUpdatedAt, expectedUpdatedAt, snapshot, message})`:44 — OCC check runs BEFORE `enforceMutationReceipt`; status 200; bucket CRUD_UPDATE_SECTION.
- **DELETE** — job-types/[id]/route.ts:49 — `parseMutationEnvelope(body, (value)=>value, {requireExpectedUpdatedAt:true})` identity parser:66; bucket CRUD_DELETE; response `{ok:true}`.

Hatches required: per-route `loadSnapshot(id) => Promise<{updatedAt}>`; per-route snapshot-envelope key (409 payload key differs: `{jobType:...}` vs `{workOrder:...}`); per-route conflict message; `requireExpectedUpdatedAt` toggle; the assert-before-reserve ordering invariant; identity input parser for DELETE.

Count: **59 = 21 POST** (24 POST − 3 CSV-export POSTs which are EXPORT bucket, no gauntlet) **+ 21 PATCH + 17 DELETE.**

### 2. runQuery (~40 handlers)
Representative at `apps/web/app/api/categories/options/route.ts:9-28`: `applyRoutePolicy → enforceQueryRateLimit → validate*Query → useCase → routeJson`, single `catch → routeError`. `enforceQueryRateLimit` appears in 57 files.

Count: **~40 of 56 GET total** = 11 `/options` + 4 `/search` (`inventory/import-numbers/search`, `inventory/locations/search`, `inventory/purchase-orders/search`, `work-orders/options/search`) + 20 module-root list GETs + 14 `[id]` detail GETs. The ~15 `/options`+`/search` are near-byte-identical (cleanest first targets). The 14 `[id]` detail GETs are a slightly different sub-shape (param parse + module `*ExecutionError` NOT-FOUND throw, e.g. job-types/[id]/route.ts:37) — decide if in scope (see flag).

### 3. minRank fold (33 sites / 20 files)
Identical 2-line `enforceRankAtLeast` block at job-types/route.ts:52-53, job-types/[id]/route.ts:59-60, job-types/[id]/primary/section/route.ts:32-33. Modules: payments, warehouses, payment-purposes, entity-types, certificates, job-types. Plus `enforceManageUsersAccess` (an `enforceRankAtLeast` wrapper) at `users/[id]/rank`, `invites`, `invites/[id]`. Fold: add `minRank?: UserRank` to `RoutePolicy` (route-policy.ts:18); `applyRoutePolicy` fires `enforceRankAtLeast` after `requireRouteAccess`, before rate-limit (:97-107).

### 4. Validator factory extraction
- **parseQuery — 36 copies.** Pattern: `const raw:Record<string,string>={}; searchParams.forEach((v,k)=>{raw[k]=v})` then `schema.safeParse(raw)`. 36 `searchParams.forEach`, 36 `.safeParse(raw)`, 36 exported `validate*Query` fns. Rep: `entity-types/_validators.ts:73-85` (list) + `:118-130` (options) — two copies in one file.
- **optionsQuerySchema — 10 files** (`*OptionsQuerySchema = z.object`): warehouses, products, entity-types, imports, unit-of-measures, job-types, properties, templates, categories, entities `_validators.ts`. Canonical (entity-types/_validators.ts:103-107): `{ search: z.string().optional(), skip: coerce.int().min(0).default(0), take: coerce.int().min(1).max(50).default(20) }`.
- **fail / requireString / requireColor.** 21 `fail` variants (each throws a module-specific `*ExecutionError`, e.g. entity-types/_validators.ts:17); 11 `requireColor` (entity-types:33, identical `isPaletteColor → PALETTE_COLOR_INVALID_MESSAGE`); 9 `requireString` (entity-types:26). `work-orders/_validators.ts:61` already has the parametrized `requireString(value, field, fail)` — the natural target signature. `fail` factory MUST stay parametrized by each module's `*ExecutionError`.

### 5. Dead code
1. **Route** `apps/web/app/api/products/form-options/route.ts` — DELETE. URL `products/form-options` referenced only inside the route file's own label:9. `getProductFormOptions` (packages/db/src/products/read-repository.ts:336) is a LIVE SSR loader (apps/web/modules/products/data/queries.ts:4,21,41) — route dead, use case STAYS (do NOT touch packages/db).
2. **7 export-only validator error classes** (defined, `this.name` set, thrown ONLY within their own `_validators.ts`, 0 external importers): `CategoryOptionsValidationError` (categories/_validators.ts:28), `CategoriesListValidationError` (categories/_validators.ts:67), `UnitOfMeasureOptionsValidationError` (unit-of-measures/_validators.ts:28), `UnitOfMeasuresListValidationError` (unit-of-measures/_validators.ts:65), `UserActivityListValidationError` (user-activity/_validators.ts:8), `UsersListValidationError` (users/_validators.ts:34), `JobTypeOptionsValidationError` (job-types/_validators.ts:111). Drop the export (or inline to a local `fail`). NOTE: `apps/web/tests/modules/unit-of-measures/unit-of-measures-routes.test.ts` exists — confirm it does NOT assert on a class name before removing.
3. **Dead helper cluster** `api-helpers.ts` (0 external refs, transitively dead): `parseBoolean`:70, `parseDecimal`:77 (the only `parseDecimal` hits are an unrelated local fn at engines/record-view/cells/contracts/cell-format.ts:47 + a comment at products/_validators.ts:30 — neither imports this), `parseDecimalOrDefault`:96, `parseOptionalStateAbbreviation`:48.
4. **2 false `@deprecated` banners:** `requireRouteAccess` (route-helpers.ts:14-17) + `enforceRouteRateLimit` (:24-27) carry `@deprecated "Use applyRoutePolicy()"` — but `applyRoutePolicy` CALLS both (route-policy.ts:97,107) and `enforceQueryRateLimit` calls `enforceRouteRateLimit` (:86). They ARE the live impl — just delete the two banner comments.

## Migration (if schema changes)
None — no schema change.

## Done means
- `/check-gauntlet` green (build + typecheck + lint + test)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
