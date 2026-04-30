# Sweep 4d — Imports / staged inventory / inventory API routes

## Context

Sweep 4a deleted use cases and reshaped types: `createInventoryUseCase` and `saveImportInventoryRowsUseCase` are gone; `CreateImportInput` lost `transportType`/`status` and gained `manufacturerId`; `UpdateInventoryInput` narrowed to `{ itemNumber, dyeLot, warehouseId, locationId, notes, isArchived }`. Sweep 4b shipped the staged-inventory-rows producer use cases (`saveStagedInventoryRowsUseCase`, `markStagedRowsForImportUseCase`, `materializeImportedStagedRowsUseCase`). Sweep 4c shipped relay + worker, but the producer is unreachable from the web — there is no API route that calls `markStagedRowsForImportUseCase`, and the existing imports/inventory routes either import deleted symbols or wire validators against types that no longer match.

Net effect: `apps/web` does not build, `apps/relay` and `apps/worker` deploy clean but sit idle on staging because nothing produces events for them. This sweep is the API-route fix-up that closes that loop.

End state after this sweep:
- All imports + inventory API routes call canonical use cases through the full mutation gauntlet defined in `docs/architecture/directories/5_api_routes.md`.
- The relay → worker pipeline becomes reachable via `curl` against staging, unblocking sweep-4c smoke verification.
- The `apps/web` build's remaining errors collapse to the UI module layer (next sweep's surface).

## Decision: include the worker-initiator route in this sweep

**Including** `POST /api/imports/[id]/staged-inventory-rows/mark-for-import`, calling `markStagedRowsForImportUseCase`.

**For (decisive):**
- The route fits the canonical mutation gauntlet 1:1 — same `applyRoutePolicy → parseMutationEnvelope → enforceMutationReceipt → withMutationTelemetry → finalizeMutationReceipt` skeleton as every other write route.
- Sweep 4c verification depends on a way to trigger `markStagedRowsForImportUseCase` end-to-end. Without this route, validation falls back to a one-off `tsx` script. With it, the staging smoke is `curl` against the deployed app.
- The route is decoupled from any future controller. The body shape (`{ stagedRowIds: string[] }`) is fully determined by the use-case signature; the response (`{ batch: { markedRowIds, outboxEventId, wasDuplicate } }`) wraps the use-case return per the wrapped-resource convention. No speculative contract surface.

**Against (acknowledged):**
- No UI calls it until the controller sweep — endpoint sits inert.
- Action-style response shape doesn't fit a `{ <module>: ... }` resource wrapper as cleanly as a section save. Mitigation: wrap as `{ batch: <result> }` and return `202 Accepted` (work queued, not done).

The deferral cost (sweep 4c verification slipping to a future sweep) outweighs the include cost (one inert endpoint with a stable contract). Locking in.

## Scope

**IN — eight files written or rewritten, one deleted:**

Imports module:
1. `apps/web/app/api/imports/_validators.ts` — rewrite.
2. `apps/web/app/api/imports/route.ts` — confirm; trivial cleanup if any imports go unused.
3. `apps/web/app/api/imports/[id]/route.ts` — replace generic `Error` on missing snapshot with typed `ImportExecutionError`.
4. `apps/web/app/api/imports/[id]/primary/section/route.ts` — same typed-error tightening; pick up rewritten validator.
5. **DELETE** `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts` and the now-empty `inventory-rows/section/` and `inventory-rows/` directories.
6. **NEW** `apps/web/app/api/imports/[id]/staged-inventory-rows/section/route.ts` (PATCH → `saveStagedInventoryRowsUseCase`).
7. **NEW** `apps/web/app/api/imports/[id]/staged-inventory-rows/mark-for-import/route.ts` (POST → `markStagedRowsForImportUseCase`).

Inventory module:
8. `apps/web/app/api/inventory/_validators.ts` — rewrite (drop create, narrow update).
9. `apps/web/app/api/inventory/route.ts` — drop the `POST` handler entirely; keep `GET`.
10. `apps/web/app/api/inventory/[id]/route.ts` — typed-error tightening on missing snapshot.
11. `apps/web/app/api/inventory/[id]/primary/section/route.ts` — typed-error tightening on missing snapshot; pick up rewritten validator.

**OUT — explicitly deferred:**
- `apps/web/modules/imports/**`, `apps/web/modules/inventory/**` (mutations/queries/components/controllers) — next sweep.
- `apps/web/app/dashboard/imports/**`, `apps/web/app/dashboard/inventory/**` page loaders — next sweep.
- A new controller for the mark-for-import action (button + status surfacing) — sweep after next.
- `apps/web/app/api/imports/options/route.ts` and `apps/web/app/api/inventory/options/route.ts` — leave untouched unless they import a removed symbol.

## Architecture (canonical gauntlet, recap)

Confirmed across `manufacturers`, `warehouses`, and the surviving imports/inventory routes today. Every mutation handler runs:

1. `applyRoutePolicy(request, { toolSlug: WAREHOUSE_TOOL_SLUG, capability: "system.access", rateLimit: { scope, limit, windowMs, route } })` → `AuthorizedRouteContext` or `Response`.
2. `parseMutationEnvelope(body, validate<X>Input, { requireExpectedUpdatedAt? })` → `{ input, mutation: { idempotencyKey, expectedUpdatedAt? } }`.
3. (PATCH/DELETE on a parent record) `await get<X>ById(id)` → `assertExpectedUpdatedAt(...)` → 409 with snapshot on mismatch.
4. `enforceMutationReceipt({ scope, request, access, mutation, body })` → return `receipt.replay` if non-null.
5. `withMutationTelemetry(access, { message, action, route, entityType, entityId? }, () => useCase(...))`.
6. `finalizeMutationReceipt({ scope, access, mutation, responseStatus, responseBody })`.
7. `routeJson(access, responseBody, init?)` for success; `routeError(access, error)` in the catch.

GET routes use `authorizeWarehouseRoute(request)` (a thin wrapper around `requireRouteAccess` for the warehouse tool, matching `applyRoutePolicy` semantics for reads) followed by `enforceQueryRateLimit`. Keep the existing `authorizeWarehouseRoute` reads — no cosmetic churn.

`_validators.ts` colocates per module (`apps/web/app/api/<module>/_validators.ts`). Validators are pure body shapers — they never call domain `validate*` helpers, since domain validation runs inside the use case. They throw module-scoped `<Module>ExecutionError` with `code`, `status: 400`, and `field` when relevant.

For `requestedBy` on the mark-for-import route: source from `access.user` (`SessionUser` shape: `{ id, email, role, isVerified }`). Pass `{ userId: access.user.id, userEmail: access.user.email }` to the use case.

## Per-file delta

### 1. `apps/web/app/api/imports/_validators.ts` — REWRITE

| Symbol | Change |
|---|---|
| `validateCreateImportInput` | Match new `CreateImportInput`: `{ orderNumber, tag, notes, warehouseId, manufacturerId }`. Drop `transportType`/`status`. Add `manufacturerId`. Use existing `requireString` / `optionalString` helpers; the use case calls `emptyToNull` so empty strings are fine on the wire. |
| `validateUpdateImportInput` | `Partial<CreateImportInput>` — only include keys present on `body`. Same field set. |
| `validateInventoryRowsDiffBody` and all `shapeDraft`/`shapePatch`/`shapeUpdate`/`shapeDelete` helpers | **DELETE.** The diff target is `StagedInventoryRowsDiff`, not `InventoryRowsDiff`. |
| `validateStagedInventoryRowsDiffBody` (NEW) | Shapes `body.diff` into `StagedInventoryRowsDiff` from `@builders/domain` (`@builders/domain/.../staged-inventory-rows/diff/types`). Per-row fields per `StagedInventoryRowDraft`, `StagedInventoryRowUpdatePatch`, `StagedInventoryRowUpdate`, `StagedInventoryRowDelete`. Field rename on the wire: `stockCount` → `startingStock`. Throws `StagedInventoryExecutionError({ code: "STAGED_DIFF_VALIDATION_FAILED", status: 400, field })`. |
| `validateMarkForImportBody` (NEW) | Shapes `body` into `{ stagedRowIds: string[] }`. Requires non-empty array of strings. Throws `StagedInventoryExecutionError({ code: "STAGED_VALIDATION_FAILED", status: 400, field })`. `requestedBy` is *not* in the body — derived from `access.user` at the route layer. |

Imports: drop `InventoryExecutionError`, `InventoryRowDraft`, `InventoryRowDelete`, `InventoryRowsDiff`, `InventoryRowUpdate`, `InventoryRowUpdatePatch`. Add `StagedInventoryExecutionError` + the staged-row diff types from `@builders/domain`.

### 2. `apps/web/app/api/imports/route.ts` — CONFIRM

Already correct: GET returns `{ imports: await listImports() }`; POST runs the gauntlet and calls `createImportUseCase(input)` with response `{ import: result }`. Validator import line stays the same after `_validators.ts` rewrite. No body change required.

### 3. `apps/web/app/api/imports/[id]/route.ts` — TIGHTEN

Already follows the gauntlet. One change: replace `return routeError(access, new Error("Import not found"))` (line 55) with throw `new ImportExecutionError({ code: "IMPORT_NOT_FOUND", message: "Import not found.", status: 404 })`. This unifies error handling so `routeError` produces the typed-error response shape consistently with the use case's own 404.

### 4. `apps/web/app/api/imports/[id]/primary/section/route.ts` — TIGHTEN

Same typed-error swap on the missing-snapshot branch. Validator import keeps pointing at the rewritten `validateUpdateImportInput`.

### 5. `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts` — DELETE

Calls deleted `saveImportInventoryRowsUseCase`. Delete the file. Remove the empty `inventory-rows/section/` and `inventory-rows/` parent dirs.

### 6. `apps/web/app/api/imports/[id]/staged-inventory-rows/section/route.ts` — NEW

Mirrors `apps/web/app/api/warehouses/[id]/sections-locations/section/route.ts` (the gold-standard diff-save section route). PATCH only.

```
PATCH /api/imports/[id]/staged-inventory-rows/section
body:     { diff: StagedInventoryRowsDiff, mutation: { idempotencyKey, expectedUpdatedAt } }
response: { import: ImportDetailRecord, tempIdMap: Record<string, string> }
```

Sequence:
1. `applyRoutePolicy({ toolSlug: WAREHOUSE_TOOL_SLUG, capability: "system.access", rateLimit: { scope: "imports.staged-inventory-rows.section.replace", limit: 50, windowMs: 600_000, route: "/api/imports/[id]/staged-inventory-rows/section" } })`.
2. `parseMutationEnvelope(body, validateStagedInventoryRowsDiffBody, { requireExpectedUpdatedAt: true })`.
3. `getImportById(id)` → throw `ImportExecutionError({ code: "IMPORT_NOT_FOUND", status: 404 })` if missing → `assertExpectedUpdatedAt({ actualUpdatedAt: snapshot.updatedAt, expectedUpdatedAt: mutation.expectedUpdatedAt, snapshot: { import: snapshot }, message: "Import changed before save completed. Refresh and try again." })`.
4. `enforceMutationReceipt({ scope: "imports.staged-inventory-rows.section.replace", ... })`.
5. `withMutationTelemetry({ action: "imports.staged-inventory-rows.section.replace", entityType: "flooringImportEntry", entityId: id, route: ".../section" }, () => saveStagedInventoryRowsUseCase(id, diff))` → `{ rows, tempIdMap }`.
6. `const detail = await getImportDetailById(id)` to compose the parent-detail response (pattern from inventory primary section route). Response: `{ import: detail, tempIdMap }`.
7. `finalizeMutationReceipt(...)`. `routeJson(access, responseBody)`.

The optimistic lock here is on the **parent import**. Per-row staleness is enforced inside the use case via `STAGED_STALE_ROW_VERSION` (the use case reads `expectedUpdatedAt` on each entry of the diff). This is the same two-tier pattern `saveSectionsWithLocationsUseCase` uses.

### 7. `apps/web/app/api/imports/[id]/staged-inventory-rows/mark-for-import/route.ts` — NEW

```
POST /api/imports/[id]/staged-inventory-rows/mark-for-import
body:     { stagedRowIds: string[], mutation: { idempotencyKey } }
response: { batch: { markedRowIds: string[], outboxEventId: string, wasDuplicate: boolean } }
status:   202 Accepted
```

Sequence:
1. `applyRoutePolicy({ toolSlug: WAREHOUSE_TOOL_SLUG, capability: "system.access", rateLimit: { scope: "imports.staged-inventory-rows.mark-for-import", limit: 30, windowMs: 600_000, route: "/api/imports/[id]/staged-inventory-rows/mark-for-import" } })`.
2. `parseMutationEnvelope(body, validateMarkForImportBody)` — **no** `requireExpectedUpdatedAt`. The use case takes the FOR-UPDATE lock on the parent import row inside its transaction; per-row staleness shows up as `STAGED_BATCH_RACE` from `markStagedRowsForImport`. Body envelope still carries `idempotencyKey` for receipt-based replay.
3. `enforceMutationReceipt({ scope: "imports.staged-inventory-rows.mark-for-import", ... })`.
4. `const requestedBy = { userId: access.user.id, userEmail: access.user.email }`.
5. `withMutationTelemetry({ action: "imports.staged-inventory-rows.mark-for-import", entityType: "flooringImportEntry", entityId: id, route: ".../mark-for-import" }, () => markStagedRowsForImportUseCase(id, stagedRowIds, requestedBy))` → `{ markedRowIds, outboxEventId, wasDuplicate }`.
6. Response body: `{ batch: result }`.
7. `finalizeMutationReceipt({ ..., responseStatus: 202, responseBody })`. `routeJson(access, responseBody, { status: 202 })`.

`STAGED_BATCH_INELIGIBLE` (already-imported rows in the batch, status mismatch) and `STAGED_BATCH_RACE` (rows changed state during the call) flow back through `routeError` → 400/409 with their typed `payload` already shaped by the use case.

### 8. `apps/web/app/api/inventory/_validators.ts` — REWRITE

| Symbol | Change |
|---|---|
| `validateCreateInventoryInput` | **DELETE.** No user-facing inventory create remains — workers materialize. |
| `CreateInventoryInput` import | Drop. |
| `validateUpdateInventoryInput` | Match new `UpdateInventoryInput`: `{ itemNumber?, dyeLot?, warehouseId?, locationId?, notes?, isArchived? }`. Drop `productId` / `stockCount` / `cost` / `freight` branches. Add `isArchived` with a boolean shaper. The doc comment about cost/freight being locked stays — still accurate, now reinforced by the type. |

### 9. `apps/web/app/api/inventory/route.ts` — DROP POST

Keep `GET` (calls `listInventory()` → `{ inventory }`). Delete the entire `POST` handler. Prune now-unused imports: `createInventoryUseCase`, `validateCreateInventoryInput`, `withMutationTelemetry`, `applyRoutePolicy`, `enforceMutationReceipt`, `finalizeMutationReceipt`, `parseMutationEnvelope`. Keep `authorizeWarehouseRoute`, `enforceQueryRateLimit`, `routeError`, `routeJson`.

### 10. `apps/web/app/api/inventory/[id]/route.ts` — TIGHTEN

DELETE handler currently does `return routeError(access, new Error("Inventory row not found"))`. Replace with `throw new InventoryExecutionError({ code: "INVENTORY_NOT_FOUND", message: "Inventory row not found.", status: 404 })`. Same swap as imports.

### 11. `apps/web/app/api/inventory/[id]/primary/section/route.ts` — TIGHTEN

Same typed-error swap on the missing-snapshot branch. The route already composes `getInventoryDetailById` for the response — keep that.

## Critical files to read while executing

- `apps/web/app/api/warehouses/[id]/sections-locations/section/route.ts` — gold-standard diff-save section route (`tempIdMap`, parent detail composition).
- `apps/web/app/api/warehouses/_validators.ts` — gold-standard validator structure for nested diff bodies.
- `apps/web/server/http/route-policy.ts` — `applyRoutePolicy`, `parseMutationEnvelope`, `enforceMutationReceipt`, `assertExpectedUpdatedAt`, `finalizeMutationReceipt` signatures.
- `apps/web/server/auth/session.ts:8-13` — `SessionUser` shape (confirms `access.user.id`, `access.user.email`).
- `packages/application/src/flooring/imports/staged-inventory-rows/save-staged-inventory-rows.ts` and `mark-staged-rows-for-import.ts` — input/output shapes for the new routes.
- `packages/domain/src/flooring/imports/staged-inventory-rows/diff/types.ts` — diff types the new validator must shape into.
- `packages/application/src/flooring/imports/staged-inventory-rows/errors.ts` — `StagedInventoryErrorCode` union (so the validator picks a real code, not a fabricated one).

## Knock-on (intentionally left red)

These will break compile after this sweep. They are the next sweep's surface:

- `apps/web/modules/imports/data/mutations.ts` — `updateImportInventoryRowsRequest` posts to `/api/imports/${id}/inventory-rows/section` (now 404) and types itself with `InventoryRowsDiff`. Re-point + re-type next sweep. Also `createImportRequest` types `CreateImportInput`, whose fields changed (`transportType`/`status` gone, `manufacturerId` added).
- `apps/web/modules/inventory/data/mutations.ts` — any `createInventoryRequest` loses its endpoint. Drop next sweep.
- Any controller that builds the diff with `stockCount` needs `startingStock`.

`tsc -b` will surface these as the next sweep's punch list — that's the desired state, not silent failure.

## Verification

1. **Type-clean at the API layer**: `npx tsc -b` from repo root reports zero errors in `apps/web/app/api/imports/**` and `apps/web/app/api/inventory/**`. Errors are confined to `apps/web/modules/**` (intentional, see Knock-on).
2. **`build:web` failure surface contracts**: `npm run build:web` still fails, but only on UI module references — no errors in `app/api/`. Confirms the failure domain shrank.
3. **Local route smoke** against a running dev DB:
   - `POST /api/imports` with `{ orderNumber, tag, notes, warehouseId, manufacturerId, mutation: { idempotencyKey } }` → 201 with `{ import }`.
   - `PATCH /api/imports/[id]/primary/section` with `{ ..., mutation: { idempotencyKey, expectedUpdatedAt } }` → 200 with `{ import }`. Stale `expectedUpdatedAt` → 409 with `{ snapshot }`.
   - `PATCH /api/imports/[id]/staged-inventory-rows/section` with `{ diff, mutation }` → 200 with `{ import, tempIdMap }`. Wire field is `startingStock` (not `stockCount`).
   - `POST /api/imports/[id]/staged-inventory-rows/mark-for-import` with `{ stagedRowIds, mutation: { idempotencyKey } }` → 202 with `{ batch: { markedRowIds, outboxEventId, wasDuplicate: false } }`.
   - `DELETE /api/imports/[id]` and `DELETE /api/inventory/[id]` with stale `expectedUpdatedAt` → 409 with `{ snapshot }`.
   - `PATCH /api/inventory/[id]/primary/section` with `cost` in body → silently dropped (still 200).
   - `POST /api/inventory` → 405 (handler is gone).
4. **Idempotency**: re-fire `mark-for-import` with the same `idempotencyKey` and the same `stagedRowIds` → identical response shape, `wasDuplicate: true` from the use case, no duplicate outbox row in `queue_outbox_event`.
5. **Sweep 4c smoke unblocked**: against staging, `curl POST /api/imports/[id]/staged-inventory-rows/mark-for-import` and watch:
   - New row in `queue_outbox_event` flips `PENDING → DISPATCHED` within ~2s.
   - Bull Board shows the job arriving in `flooring-imports-materialize`.
   - Worker logs `event: "job.completed"`.
   - Inventory rows materialize with the snapshot fields.
   - Staged rows flip `QUEUED → IMPORTED`.

## Sequencing

1. Rewrite `apps/web/app/api/imports/_validators.ts` and `apps/web/app/api/inventory/_validators.ts` first — every other change in this sweep imports from them.
2. Inventory: drop `POST` from `apps/web/app/api/inventory/route.ts`; tighten typed errors in `[id]/route.ts` and `[id]/primary/section/route.ts`. Smallest delta, validates the validator rewrite.
3. Imports: tighten typed errors in `route.ts` (no-op confirm), `[id]/route.ts`, `[id]/primary/section/route.ts`.
4. Delete `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts` and parent dirs.
5. Add `apps/web/app/api/imports/[id]/staged-inventory-rows/section/route.ts`.
6. Add `apps/web/app/api/imports/[id]/staged-inventory-rows/mark-for-import/route.ts`.
7. Run `npx tsc -b`; confirm errors confined to `apps/web/modules/**`.
8. Local route smoke (Verification §3).
9. Deploy to staging; run sweep 4c end-to-end smoke (Verification §5).

## Out of scope after this sweep

- `apps/web/modules/imports/**`, `apps/web/modules/inventory/**` — components, controllers, `data/{queries,mutations}.ts`. Next sweep.
- `apps/web/app/dashboard/imports/**`, `apps/web/app/dashboard/inventory/**` page loaders. Next sweep.
- Controller for the mark-for-import action (action button, status surfacing, polling). Sweep after next.
- The materialize use case has no HTTP route by design — only the worker's BullMQ processor consumes it. That stays the rule.
