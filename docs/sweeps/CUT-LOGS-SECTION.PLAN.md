# Cut Logs Section — Application + Route Plan (Phase 5+6)

## Context

Phase 1 shipped the `FlooringCutLog.cost`/`freight`/`isWaste` columns. Phase 2 seeded 4 coverage categories (`vinyl-plank`, `carpet-tile`, `covebase`, `pad`) + 16 one-to-one categories. Phase 3+4 shipped `@builders/domain` (categories hub + cut-logs module: `assertCanAddCutLog`, `assertBeforeCutAfterInvariant`, `assertCutLogDeleteAllowed`, `isCutLogStatus`, `CutLogDomainError`, `convertStockToCoverage`) and `@builders/db` normalizer updates (`CutLogRow` now carries `cost`/`freight`/`isWaste`/`coverage`).

What's left: wire the application use case + API route so users can mutate cut logs from the inventory record view with server-stamped snapshots, per-row concurrency safety, and the standard auth/rate/idempotency gauntlet.

**Simplifying constraint (user decision):** one cut-log change per save (add OR modify OR delete, not a batch). Drops batch reverse-delete walk + tempIdMap complexity. The UI submits one action per PATCH.

---

## Execution plan — by layer

### 1. Domain layer — **no changes required**

Everything needed is already in `@builders/domain` from Phase 3+4:

- `assertCanAddCutLog(inventory)` — throws `CUT_LOG_INVENTORY_NOT_IMPORTED`.
- `assertBeforeCutAfterInvariant({ before, cut, after })` — throws `CUT_LOG_ARITHMETIC_MISMATCH`.
- `isCutLogMostRecent(cut, siblings)` / `assertCutLogDeleteAllowed(cut, siblings)` — throws `CUT_LOG_DELETE_NOT_MOST_RECENT`.
- `isCutLogStatus(value)` — runtime guard.
- `convertStockToCoverage` / `computeCutCoverage` / `computeInventoryAvailableCoverage` — coverage math, gated by category slug.
- `CutLogDomainError` with 5 codes.

The 1-per-save rule means we never need a batch-delete helper. Domain stays as-is.

---

### 2. Data layer — **persistence only, one new primitive**

**Rule:** no domain imports in write path, no validation, no FOR UPDATE (caller owns locking). Pre-stamped inputs come in, rows go out.

**Modify: `packages/db/src/flooring/inventory/write-repository.ts`**

Add three narrow primitives instead of a diff-apply function (cleaner given 1-per-save):

```ts
export async function createCutLog(
  input: {
    inventoryId: string
    cut: Prisma.Decimal
    before: Prisma.Decimal
    after: Prisma.Decimal
    status: "PENDING" | "FINAL"
    isWaste: boolean
    cost: Prisma.Decimal | null
    freight: Prisma.Decimal | null
    notes: string
  },
  client: Prisma.TransactionClient,
): Promise<InventoryCutLogRecord>

export async function updateCutLog(
  id: string,
  patch: { status?: "PENDING" | "FINAL"; isWaste?: boolean; notes?: string },
  client: Prisma.TransactionClient,
): Promise<InventoryCutLogRecord>

export async function deleteCutLog(id: string, client: Prisma.TransactionClient): Promise<void>
```

Each function is ~5 lines: Prisma create/update/delete + a follow-up `findUnique` to hydrate for return (except delete). Rehydration uses the existing `normalizeCutLogRow(row, context)` — caller passes `{ categorySlug, coveragePerUnit }` so the returned row has `coverage` computed.

**Reuse as-is:**
- `getInventoryDetailById(id, tx)` — confirmed to accept a tx client (`read-repository.ts:261`).
- `cutLogRowSelect` in `shared.ts` — already selects `cost`, `freight`, `isWaste`.
- `normalizeCutLogRow(row, context)` — already wires coverage computation.

---

### 3. Application layer — **new use case + errors**

**Modify: `packages/application/src/flooring/inventory/errors.ts`** — add codes:

| Code | HTTP |
|---|---|
| `CUT_LOG_INVENTORY_NOT_IMPORTED` | 400 |
| `CUT_LOG_ARITHMETIC_MISMATCH` | 400 |
| `CUT_LOG_DELETE_NOT_MOST_RECENT` | 400 |
| `CUT_LOG_EXCEEDS_STARTING_BALANCE` | 400 |
| `CUT_LOG_STALE_ROW_VERSION` | 409 |
| `CUT_LOG_NOT_FOUND` | 404 |
| `CUT_LOG_INVALID_PATCH_FIELDS` | 400 (backstop — validator should catch first) |

**New: `packages/application/src/flooring/inventory/save-cut-logs.ts`**

Discriminated-union action type:

```ts
export type SaveCutLogAction =
  | { kind: "add";    cut: string; status: "PENDING" | "FINAL"; isWaste: boolean; notes: string }
  | { kind: "modify"; id: string; expectedUpdatedAt: string;
      patch: { status?: "PENDING" | "FINAL"; isWaste?: boolean; notes?: string } }
  | { kind: "delete"; id: string; expectedUpdatedAt: string }

export async function saveInventoryCutLogsUseCase(
  inventoryId: string,
  action: SaveCutLogAction,
): Promise<{ inventory: InventoryDetailRecord; cutLogId: string | null }>
```

Flow (single-action variant — simpler than batch):

1. `withDatabaseTransaction(async (tx) => { ... })`
2. `tx.$queryRaw(Prisma.sql\`SELECT "id" FROM "flooring_inventory" WHERE "id" = ${inventoryId} FOR UPDATE\`)` — parent lock.
3. If `action.kind !== "add"`: `tx.$queryRaw(Prisma.sql\`SELECT "id" FROM "flooring_cut_log" WHERE "id" = ${action.id} FOR UPDATE\`)` — child lock.
4. Load `inventory = await getInventoryDetailById(inventoryId, tx)`. Null → `InventoryExecutionError("INVENTORY_NOT_FOUND", 404)`.
5. **Per-action branches:**

   **Add branch:**
   - `assertCanAddCutLog(inventory)` (domain).
   - `isCutLogStatus(action.status)` (domain).
   - Compute using `Prisma.Decimal`:
     - `existingCutSum = sum(inventory.cutLogs.cut)`
     - `before = stockCount − existingCutSum`
     - `after = before − cut`
     - `costPerUnit = (inventory.cost != null && stockCount > 0) ? inventory.cost / stockCount : null`
     - `freightPerUnit = same for freight`
     - `cutCost = costPerUnit × cut` (null if costPerUnit null)
     - `cutFreight = freightPerUnit × cut` (null if freightPerUnit null)
   - `assertBeforeCutAfterInvariant({ before, cut, after })` (domain).
   - Aggregate check: `stockCount − (existingCutSum + cut) >= 0` else `CUT_LOG_EXCEEDS_STARTING_BALANCE`.
   - `created = await createCutLog(tx, { ...stampedFields })`.

   **Modify branch:**
   - Locate target cut in `inventory.cutLogs`. Not found → `CUT_LOG_NOT_FOUND`.
   - `target.updatedAt === action.expectedUpdatedAt`? No → `CUT_LOG_STALE_ROW_VERSION`.
   - `isCutLogStatus(patch.status)` if set.
   - Validator should have already stripped any non-editable keys; use case passes only `{ status?, isWaste?, notes? }` forward.
   - `await updateCutLog(tx, target.id, patch)`.

   **Delete branch:**
   - Locate target cut. Not found → `CUT_LOG_NOT_FOUND`.
   - `target.updatedAt === action.expectedUpdatedAt`? No → `CUT_LOG_STALE_ROW_VERSION`.
   - `assertCutLogDeleteAllowed(target, inventory.cutLogs)` (domain).
   - `await deleteCutLog(tx, target.id)`.

6. Re-read `inventory = await getInventoryDetailById(inventoryId, tx)`.
7. Return `{ inventory, cutLogId: created?.id ?? action.id ?? null }`.

**Modify: `packages/application/src/flooring/inventory/index.ts`** — barrel export `saveInventoryCutLogsUseCase` and the `SaveCutLogAction` type.

---

### 4. Route layer — **new section route + validator**

**Modify: `apps/web/app/api/inventory/_validators.ts`** — add `validateCutLogsActionBody(body): SaveCutLogAction`.

Shape (strict — unknown keys rejected to prevent sneaking in server-only fields):

- Required top-level key: `kind: "add" | "modify" | "delete"`.
- **`kind: "add"`** accepts exactly: `cut` (required, decimal string), `status` (optional default `"PENDING"`), `isWaste` (optional default `false`), `notes` (optional default `""`). Any of `id`, `before`, `after`, `cost`, `freight`, `workOrderId`, `workOrderItemId`, `expectedUpdatedAt`, `inventoryId` → `INVENTORY_VALIDATION_FAILED` + offending field name. Error message guides the caller: "Server computes `before`/`after`/`cost`/`freight`; work-order linkage is set from the work-order record view."
- **`kind: "modify"`** accepts exactly: `id`, `expectedUpdatedAt`, and at least one of `status`, `isWaste`, `notes`. Rejects `cut`, `before`, `after`, `cost`, `freight`, `workOrderId`, `workOrderItemId` with the same error.
- **`kind: "delete"`** accepts exactly: `id`, `expectedUpdatedAt`.

**New: `apps/web/app/api/inventory/[id]/cut-logs/section/route.ts`** — PATCH only.

Copy structure of `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts` (known twin). Adjustments:

- `applyRoutePolicy({ toolSlug: "warehouse", rateLimit: { scope: "inventory.cut-logs.section.replace", limit: 50, windowMs: 600000, route: "/api/inventory/[id]/cut-logs/section" } })`.
- `parseMutationEnvelope(body, validateCutLogsActionBody, { requireExpectedUpdatedAt: true })` — envelope-level expectedUpdatedAt on the **parent inventory row** (catches parent deletion/primary-change; per-row check inside use case catches cut-log concurrency).
- `getInventoryById(id)` for snapshot; `assertExpectedUpdatedAt` against parent.
- `enforceMutationReceipt({ scope: "inventory.cut-logs.section.replace", ... })`.
- `withMutationTelemetry(access, { message: "Inventory cut logs saved", action: "inventory.cut-logs.section.replace", route, entityType: "flooringCutLog", entityId: id /* parent */ }, () => saveInventoryCutLogsUseCase(id, action))`.
- `finalizeMutationReceipt` → `routeJson(access, { inventory, cutLogId })`.
- Errors flow through existing `routeError(access, error)` — `InventoryExecutionError.status` is read by `normalizePrismaError` at `apps/web/server/http/api-helpers.ts:137`.

---

## Critical files

| Action | Path |
|---|---|
| Modify | `packages/db/src/flooring/inventory/write-repository.ts` (+3 functions) |
| Modify | `packages/application/src/flooring/inventory/errors.ts` (+7 codes) |
| New | `packages/application/src/flooring/inventory/save-cut-logs.ts` |
| Modify | `packages/application/src/flooring/inventory/index.ts` (barrel) |
| Modify | `apps/web/app/api/inventory/_validators.ts` (+1 validator) |
| New | `apps/web/app/api/inventory/[id]/cut-logs/section/route.ts` |

## Verification

- `npm run build --workspace @builders/db` clean.
- `npm run build --workspace @builders/application` clean.
- `npm run typecheck --workspace @builders/web` — new route + validator add zero errors over the pre-existing ~107 work-order-allocation errors baseline.
- Grep `grep -rn "\"cut-logs/section\"" apps/web/app/api` → only the new route.
- Manual golden path via curl:
  - Setup: inventory row `cost=100, freight=20, stockCount=10, isImported=true`; vinyl-plank product with `coveragePerUnit=2`.
  - `PATCH /api/inventory/:id/cut-logs/section` with `kind:"add", cut:"2"` → response includes cut with `cost="20.00"`, `freight="4.00"`, `coverage="4.00"`, `before="10.00"`, `after="8.00"`, `status="PENDING"`, `isWaste=false`.
  - Second `PATCH` same shape → second cut has `before="8.00"`, `after="6.00"`, same unit price snapshot.
- Manual concurrency check: two clients load the same cut log, both submit modify with same `expectedUpdatedAt`. Second returns 409 `CUT_LOG_STALE_ROW_VERSION`.
- Manual delete rule: try deleting the oldest of 3 cuts → 400 `CUT_LOG_DELETE_NOT_MOST_RECENT`.
- Manual non-imported guard: cut against `isImported=false` row → 400 `CUT_LOG_INVENTORY_NOT_IMPORTED`.
- Idempotency replay: resend with same `idempotencyKey` → stored receipt returned, no re-execution.

---

## Concerns — by layer

### Domain concerns
- **None.** Phase 3+4 delivered the full surface this sweep needs. No new domain code; the 1-per-save rule dissolves the batch-delete concern without new helpers.

### Data-layer concerns
- **Cost/freight computation precision.** JS float division for `inventory.cost / stockCount × cut` can drift by 0.005 on ugly inputs (e.g. `$100 / 7 × 3 = 42.857142...` rounded to `42.86` via `.toFixed(2)` vs. `42.857 → 42.86` via Decimal round-half-even — same answer here but not always). Recommendation: use `Prisma.Decimal` throughout the stamping computation, round at persist time to `DECIMAL(10,2)`. This keeps storage honest for eventual accounting rollups.
- **Does child-mutation bump `inventory.updatedAt`?** Prisma's `@updatedAt` only fires on direct updates to the row. Cut-log CRUD does not touch the inventory row → parent `updatedAt` does not bump. Read-side aggregates (`availableBalance`, `availableCoverage`) DO change because they're computed fresh each read, but the `updatedAt` version vector doesn't reflect that. Client caching keyed to `inventory.updatedAt` would miss the aggregate change. Two ways out — see Recommendations.

### Application-layer concerns
- **Transaction timeout.** Default Prisma `$transaction` timeout is 5s. Our flow: 1 FOR UPDATE, 1 detail read, domain checks (<1ms), 1 write (create/update/delete), 1 re-read. Normal runtime is 200–500 ms on healthy connection. No change needed unless the DB is unhealthy.
- **Lock-order convention.** This use case locks parent inventory → then at most one cut-log row. Next sweep (work-order save-material-items, per user spec: "locks material items + cut logs + inventory parent row, NOT the work-order") will potentially touch the same cut-log rows via a different code path. If lock order diverges, deadlock. Recommendation: document invariant **"whenever you touch a cut log, lock its parent inventory row first"**.
- **Coverage gating on cut-log read.** After Phase 3+4, `normalizeCutLogRow` receives `{ categorySlug, coveragePerUnit }` from `normalizeInventoryDetail` and passes to `computeCutCoverage`. The coverage-gate check (`hasCoverageUnit(slug)`) is what blocks non-coverage categories regardless of stray `coveragePerUnit` values on a product. Verified: ✅ cut logs emit `coverage: ""` for adhesive/baseboard/etc. and `coverage: "N.NN"` for vinyl-plank/carpet-tile/covebase/pad when `coveragePerUnit` is set.
- **Cost/freight gating on cut-log read.** Cost and freight are *always* stock-unit based (dollars-per-stock-unit × stock-units). Not category-gated. The normalizer emits whatever was persisted. Verified: ✅ fields surface unconditionally; null in DB → `""` in response.

### Route-layer concerns
- **Rate scope naming.** No central registry — scope strings are inlined in route files. `inventory.cut-logs.section.replace` follows the existing `{module}.{section}.replace` convention.
- **Envelope-level vs per-row `expectedUpdatedAt`.** Envelope checks the parent; per-row inside the use case checks the mutated cut log. Both required by this plan. Alternative: drop envelope-level (parent is FOR UPDATE locked anyway) and rely on per-row. Minor simplification, slight concurrency-detection loss around parent deletion. Recommendation: keep both — thoroughness over brevity on mutation paths.
- **Unknown-key rejection.** Validator must reject unexpected keys, not just validate the known ones. Otherwise a client could try to sneak `cost`/`before`/`after`/`workOrderId` in. The existing `requireString` helpers in `_validators.ts` don't reject unknown keys by default — new validator must explicitly list allowed keys and reject others. Flag: implementation detail, not a design concern.

---

## Recommendations

### 1. Adopt the 1-cut-log-per-save rule
**Strong recommend.** Already your proposal. Consequences:
- No tempIdMap round-trip (single add returns a single id).
- No batch reverse-delete walk.
- Validator shrinks to a discriminated union.
- Use case has one branch per action kind, no diff apply loop.
- Per-click latency is one round-trip per cut-log change — acceptable given how infrequently this happens per session.

### 2. Use `Prisma.Decimal` for cost/freight computation
**Recommend.** 5 lines of code change, removes a class of rounding drift. The input is Decimal (from DB), the output is Decimal (to DB) — the only reason to go through JS `number` is convenience, and that convenience costs accounting correctness.

### 3. On raising transaction timeout
**Recommend: do NOT raise.** Breakdown of what "raising the timeout" means:
- It is **not a performance tax**. The timeout is a ceiling, not a target. A 500ms transaction takes 500ms whether the timeout is 5s or 15s.
- It is **not a behavior change** for healthy transactions.
- Raising only takes effect if a transaction **actually blocks for >5s**, in which case you're now waiting 15s to see the error — which is usually worse for user feedback than failing fast.
- **Blast radius** if raised: only transactions that opt into the new timeout. Prisma's `withDatabaseTransaction` wrapper currently takes a plain callback — adding options to it would require a one-line helper change (`packages/db/src/client.ts`). Low risk technical change, but not justified by this use case's runtime profile.
- **Decision:** keep 5s default. If we see timeout errors in practice, revisit with actual data.

### 4. On `inventory.updatedAt` bump after cut-log mutation
**Recommend Option B below.** Two approaches:

- **Option A:** `applyCutLogsDiff`/the write primitives no-op update the parent inventory row so its `updatedAt` bumps. Makes client cache invalidation trivially correct. Cost: one extra UPDATE per save. Concern: masks the real invariant (parent row isn't semantically changing), and couples cut-log writes to parent schema in a non-obvious way.
- **Option B:** Don't bump. The route returns the fresh `InventoryDetailRecord` in the response body. Client replaces its local cache with the response. No separate cache-invalidation mechanism needed. This matches how the imports section route works.
- **Decision:** Option B. Already implicit in the plan — the route returns `{ inventory, cutLogId }`.

### 5. On envelope `expectedUpdatedAt` vs per-row
**Recommend: keep both.** Defense in depth. Per-row catches the real race (concurrent cut-log edit); envelope catches the weird-but-possible (parent inventory deleted or primary-field-edited mid-flow). Cost is zero — both checks already exist as helpers.

### 6. Single-action flow also benefits the work-orders sweep
Your planned work-orders save-material-items lock scope ("locks material items + cut logs + inventory parent, not the work-order") is already compatible with this sweep's lock order: **parent inventory → cut logs**. As long as both save paths lock inventory first before touching cut logs, no deadlock. Document this invariant in the cut-log write-repository as a comment on `createCutLog`/`updateCutLog`/`deleteCutLog`.

---

## Is our current path going to land us in a good spot once this section is secure?

**Yes**, with this sweep shipping cleanly, here's the state:

- **User can** create/edit/delete cut logs from the inventory record view with server-stamped cost/freight/before/after, editable waste/status/notes, and concurrency safety.
- **Coverage** is computed and displayed per cut log only for the 4 coverage categories (`vinyl-plank`, `carpet-tile`, `covebase`, `pad`). One-to-one categories silently emit `""`.
- **Prices** (cost/freight) snapshot at create time, frozen for the life of the cut, correct down to 2dp via `Prisma.Decimal`.
- **Concurrency** handled via per-row `expectedUpdatedAt` + parent `expectedUpdatedAt` at envelope level.
- **Auth / rate / idempotency / transaction** all flow through the established gauntlet — zero hand-rolling.
- **Forward compat** confirmed for work-orders save-material-items: lock order (inventory → cut-log) is the invariant that sweep must honor; the data-layer primitives (`createCutLog`/`updateCutLog`/`deleteCutLog`) are reusable with a different `workOrderId`/`workOrderItemId` stamping rule.

Known follow-ons (**not** blockers for this sweep):
1. UI wiring to display `cost`/`freight`/`coverage`/`isWaste` on the cut-logs section (Phase 7 UI sweep).
2. Work-orders save-material-items use case — the second entry point for cut-log mutations.
3. Expense rollups on `FlooringAnalytics` (future): `SUM(cost) + SUM(freight)` across work-order-linked cut logs.

---

## Flags for finalization

- [ ] Confirm: use `Prisma.Decimal` for cost/freight computation (recommended #2 above).
- [ ] Confirm: keep transaction timeout at default 5s (recommended #3).
- [ ] Confirm: do NOT bump `inventory.updatedAt` on cut-log writes; client reconciles from the response body (recommended #4).
- [ ] Confirm: keep both envelope-level and per-row `expectedUpdatedAt` checks (recommended #5).
- [ ] Confirm: 1 cut log change per save — no batch.
- [ ] Confirm: validator rejects unknown keys (not just unknown values).
- [ ] Confirm: route rate scope `inventory.cut-logs.section.replace`.
- [ ] Confirm: error code list (7 codes) — especially `CUT_LOG_STALE_ROW_VERSION` at 409 vs reusing `INVENTORY_STALE_ROW_VERSION`.
