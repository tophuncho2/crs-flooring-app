# Sweep 5a — Imports + Inventory API routes (re-wire to canonical use cases)

## Headlines

- Re-points imports + inventory API routes onto the canonical use cases in `packages/application/src/flooring/{imports,inventory,imports/staged-inventory-rows}` so `apps/web` builds clean for the first time since sweep 4a deleted the old creators.
- **Renames** the imports child-section route from `/api/imports/[id]/inventory-rows/section` → `/api/imports/[id]/staged-inventory-rows/section` to match the new domain entity (`flooring_staged_inventory_row`) and the new use case `saveStagedInventoryRowsUseCase`.
- **Drops** `POST /api/inventory` and `POST /api/imports/[id]/inventory-rows/section` for the legacy `saveImportInventoryRowsUseCase` — inventory rows are now created exclusively via the materialize worker, never directly via HTTP.
- Rewrites both `_validators.ts` files against the actual `@builders/application` + `@builders/domain` types (current validators reference fields that don't exist on the use-case input types).
- **Defers** the worker-trigger route (`mark-staged-rows-for-import`) — it ships in the next sweep paired with its controller. Argument and decision in §6.
- **Out of scope:** `apps/web/modules/<module>/` rewires (mutations.ts re-points, controllers, components), `apps/web/app/dashboard/<module>/` loaders, and the worker-trigger route. Those land in the next sweep.

## 1. Why this sweep

After sweep 4c, relay + worker deploy clean to Railway but `apps/web` still won't build. The sweep-4c plan called this out explicitly: `apps/web/app/api/inventory/route.ts:2` imports a `createInventoryUseCase` symbol that sweep 4a deleted. There is parallel drift in the imports routes: the inventory-rows section route imports `saveImportInventoryRowsUseCase` (also gone, replaced by `saveStagedInventoryRowsUseCase`), and `_validators.ts` for both modules references field shapes that the new application-layer types do not have.

This sweep is the API-route half of sweep 5. The plan is split because the next sweep needs to introduce a new controller for the user-initiated worker run (mark-staged-rows-for-import), and the existing module/controllers won't survive the section rename intact. Doing the routes first gives the next sweep a stable HTTP surface to wire UI against.

## 2. Inventory current state (drift to fix)

| File | Current | Target |
|---|---|---|
| `apps/web/app/api/inventory/route.ts` | `POST` calls `createInventoryUseCase` (deleted in sweep 4a). Build fails here. | Drop `POST` entirely. Keep `GET` (lists `listInventory()`). Inventory rows are created by the materialize worker, not by HTTP create. |
| `apps/web/app/api/inventory/[id]/route.ts` | `GET` + `DELETE` calling `deleteInventoryUseCase`. Pipeline correct. | Keep as-is, modulo: switch `authorizeWarehouseRoute` → `applyRoutePolicy({ toolSlug: WAREHOUSE_TOOL_SLUG, capability: "system.access" })` to match the canonical pipeline (manufacturers reference). Use `parseUuidParam` on the id. Throw `InventoryExecutionError` on missing snapshot instead of `new Error("…")`. |
| `apps/web/app/api/inventory/[id]/primary/section/route.ts` | `PATCH` calling `updateInventoryUseCase`. Pipeline correct; composes `getInventoryDetailById` for response. | Keep mechanics. Tighten: use `parseUuidParam`, throw `InventoryExecutionError("INVENTORY_NOT_FOUND")` instead of generic `Error`. Validator must be rewritten (see below). |
| `apps/web/app/api/inventory/_validators.ts` | Validates `productId`, `warehouseId`, `locationId`, `itemNumber`, `dyeLot`, `stockCount`, `cost`, `freight`, `notes` against `CreateInventoryInput` + `UpdateInventoryInput`. | The new `UpdateInventoryInput` is `{ itemNumber?, dyeLot?, warehouseId?, locationId?, notes?, isArchived? }` only. `CreateInventoryInput` does not exist. Rewrite to match: drop `validateCreateInventoryInput`, narrow `validateUpdateInventoryInput` to the six allowed fields, plus optional `isArchived: boolean`. |
| `apps/web/app/api/inventory/options/route.ts` | (not read this sweep — touched only if it imports a deleted symbol) | Verify still compiles; no scope changes planned. |

## 3. Imports current state (drift to fix)

| File | Current | Target |
|---|---|---|
| `apps/web/app/api/imports/route.ts` | `GET` + `POST` calling `createImportUseCase`. Pipeline correct. | Keep mechanics. Switch the `GET` from `authorizeWarehouseRoute` to `applyRoutePolicy` for consistency. Validator rewrite (below). |
| `apps/web/app/api/imports/[id]/route.ts` | `GET` + `DELETE` calling `deleteImportUseCase`. Pipeline correct. | Same as inventory `[id]`: `parseUuidParam`, throw `ImportExecutionError("IMPORT_NOT_FOUND")` instead of generic `Error`, switch to `applyRoutePolicy`. |
| `apps/web/app/api/imports/[id]/primary/section/route.ts` | `PATCH` calling `updateImportUseCase`. Pipeline correct. | Same hardening (uuid parse + typed `IMPORT_NOT_FOUND` error). Validator rewrite (below). |
| `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts` | Calls `saveImportInventoryRowsUseCase` (deleted). | **DELETE this file and its parent dir**. Replace with new route at `apps/web/app/api/imports/[id]/staged-inventory-rows/section/route.ts` that calls `saveStagedInventoryRowsUseCase`. See §4. |
| `apps/web/app/api/imports/_validators.ts` | `validateCreateImportInput`/`validateUpdateImportInput` produce `transportType`, `status`, plus they reference inventory-row diff types `InventoryRowsDiff`, `InventoryRowDraft`, `InventoryRowUpdate`. None of those exist on the new types. | Rewrite. The new `CreateImportInput` is `{ orderNumber, tag, notes, warehouseId, manufacturerId }` (all strings, all required). New diff validator targets `StagedInventoryRowsDiff` from `@builders/domain` — fields renamed `stockCount` → `startingStock` and the validator uses `StagedInventoryExecutionError` codes (`STAGED_DIFF_VALIDATION_FAILED`), not `INVENTORY_DIFF_VALIDATION_FAILED` (which is not a real code). |
| `apps/web/app/api/imports/options/route.ts` | (not read — defer unless it imports a removed symbol) | Verify only. |

## 4. New route — staged inventory rows section

`apps/web/app/api/imports/[id]/staged-inventory-rows/section/route.ts`

Follows the manufacturers/warehouses canonical pipeline shape. Method: `PATCH`.

```
applyRoutePolicy({ toolSlug: WAREHOUSE_TOOL_SLUG, capability: "system.access",
  rateLimit: { scope: "imports.staged-inventory-rows.section.replace", limit: 50, windowMs: 600_000,
               route: "/api/imports/[id]/staged-inventory-rows/section" } })
parseUuidParam(rawId, "id")
parseMutationEnvelope(body, validateStagedInventoryRowsDiffBody, { requireExpectedUpdatedAt: true })
getImportById(id) → 404 via ImportExecutionError("IMPORT_NOT_FOUND") if missing
assertExpectedUpdatedAt({ actual: import.updatedAt, expected, snapshot: { import }, message: "Import changed before save completed. Refresh and try again." })
enforceMutationReceipt(...)
withMutationTelemetry({ action: "imports.staged-inventory-rows.section.replace", entityType: "flooringImportEntry", entityId: id }, () => saveStagedInventoryRowsUseCase(id, diff))
respond { import: getImportDetailById(id), rows: result.rows, tempIdMap: result.tempIdMap }
finalizeMutationReceipt(...)
```

The use case returns `{ rows, tempIdMap }`. Compose the detail at the route boundary so the client controller can reconcile both the parent header and the rows table in a single round trip — the warehouses/sections-locations route does the same.

The optimistic lock is on the **parent import**, not the individual rows. The use case itself enforces per-row optimistic locks via `STAGED_STALE_ROW_VERSION` (it reads `expectedUpdatedAt` off each row in the diff). This is the same two-tier pattern that `saveSectionsWithLocationsUseCase` uses.

## 5. Validators rewrite — `_validators.ts` (per module)

Both files keep the colocated underscore-prefix convention (`apps/web/app/api/<module>/_validators.ts`). Each file owns the input shapers for every route in that module's tree, including child-section diff bodies. Validators throw module-scoped execution errors with `code`, `field`, and `status: 400` — never `Error`, never `zod`.

### `apps/web/app/api/imports/_validators.ts`

| Export | Returns | Notes |
|---|---|---|
| `validateCreateImportInput(body)` | `CreateImportInput` from `@builders/application` | Required strings: `orderNumber`, `tag`, `notes`, `warehouseId`, `manufacturerId`. Throws `ImportExecutionError("IMPORT_VALIDATION_FAILED", field)`. Empty-string is allowed for the optional-business-rule fields; the use case calls `emptyToNull`. |
| `validateUpdateImportInput(body)` | `UpdateImportInput` (= `Partial<CreateImportInput>`) | Only includes keys present on `body`. |
| `validateStagedInventoryRowsDiffBody(body)` | `StagedInventoryRowsDiff` from `@builders/domain` | Shapes the wire diff into the domain type. Field rename: wire field `stockCount` is dropped — the canonical wire field is `startingStock` to match the domain. Throws `StagedInventoryExecutionError("STAGED_VALIDATION_FAILED", field)` for body-shape errors (NOT a fake `INVENTORY_DIFF_VALIDATION_FAILED`). Business-rule validation (warehouse mismatch, locked rows, unknown product/location) stays inside the use case via `validateStagedInventoryRowsDiff`. |

Drops the legacy `validateInventoryRowsDiffBody` export entirely.

### `apps/web/app/api/inventory/_validators.ts`

| Export | Returns | Notes |
|---|---|---|
| `validateUpdateInventoryInput(body)` | `UpdateInventoryInput` | Only the six fields the use case accepts: `itemNumber`, `dyeLot`, `warehouseId`, `locationId`, `notes`, `isArchived`. The current explanatory comment about cost/freight being routed via the imports diff path stays (true, still relevant). |

Drops `validateCreateInventoryInput`.

## 6. Worker-trigger route — defer; argument

The user explicitly framed this sweep as routes-only and the next sweep as "modules + dashboard + the controller for the user to initiate the worker." The relevant route would be:

`POST /api/imports/[id]/staged-inventory-rows/import`  →  `markStagedRowsForImportUseCase(importEntryId, stagedRowIds, requestedBy)`

### Argument for including it now

- The sweep-4c verification step says "From a one-off tsx script (or the eventual sweep-5 route)" — the route is already on the next-sweep punch list. Landing it now would let the staging smoke-test path use HTTP instead of a tsx script.
- It's a sibling of the staged-inventory-rows section route. Co-locating both keeps the `staged-inventory-rows/` URL subtree symmetrical.
- The pipeline (`applyRoutePolicy` → `parseMutationEnvelope` → `enforceMutationReceipt` → use case → `finalizeMutationReceipt`) is identical to every other write route.

### Argument against (decision)

- The route is **shaped differently** from every other route in this sweep:
  - `requestedBy: { userId, userEmail }` is sourced from `access.session`, not from the body. That's a new pattern the codebase doesn't use anywhere else; designing it deserves its own pass.
  - There is no parent-record `expectedUpdatedAt` to gate on — the use case takes a list of staged-row ids and locks the import row inside the transaction. The mutation envelope's `requireExpectedUpdatedAt` does not apply cleanly.
  - The use case returns `{ markedRowIds, outboxEventId, wasDuplicate }`. There is no equivalent "section save" response convention.
- The user's stated framing draws the line here: "the controllers for users to initiate the worker will have to wait. Also include the API routes which call the inventory update and delete use cases." That places update/delete inside this sweep and the worker-trigger outside.
- Decoupling the route from its controller increases the risk of getting the route wrong — without a calling controller in hand, the request body shape (just `{ stagedRowIds: string[] }`?) and response contract are speculative.
- Smoke-testing the worker without the route is cheap: a one-off tsx script invoking `markStagedRowsForImportUseCase` directly is what sweep-4c already documented.

**Decision: defer.** The worker-trigger route ships in the next sweep alongside the controller hook that calls it. This sweep stops at the section save.

## 7. Per-file delta (this sweep)

### Routes

| File | Change |
|---|---|
| `apps/web/app/api/imports/route.ts` | Switch `GET` to `applyRoutePolicy({ toolSlug: WAREHOUSE_TOOL_SLUG, capability: "system.access" })`. POST mechanics unchanged (still calls `createImportUseCase`). |
| `apps/web/app/api/imports/[id]/route.ts` | Switch `GET` + `DELETE` to `applyRoutePolicy`. Use `parseUuidParam(rawId, "id")`. Throw `ImportExecutionError("IMPORT_NOT_FOUND", status: 404)` on missing snapshot in `DELETE`. |
| `apps/web/app/api/imports/[id]/primary/section/route.ts` | `parseUuidParam`. Throw `ImportExecutionError("IMPORT_NOT_FOUND")` on missing snapshot. Imports `validateUpdateImportInput` from rewritten `_validators.ts`. |
| `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts` | **DELETE** (and the empty `inventory-rows/section/`, `inventory-rows/` parent dirs). |
| `apps/web/app/api/imports/[id]/staged-inventory-rows/section/route.ts` | **NEW.** Spec in §4. Calls `saveStagedInventoryRowsUseCase`. |
| `apps/web/app/api/imports/_validators.ts` | Rewritten per §5. |
| `apps/web/app/api/inventory/route.ts` | **Drop the `POST` handler.** Keep `GET`, switch it to `applyRoutePolicy`. |
| `apps/web/app/api/inventory/[id]/route.ts` | Switch `GET` + `DELETE` to `applyRoutePolicy`. `parseUuidParam`. Throw `InventoryExecutionError("INVENTORY_NOT_FOUND")` on missing snapshot. |
| `apps/web/app/api/inventory/[id]/primary/section/route.ts` | `parseUuidParam`. Throw `InventoryExecutionError("INVENTORY_NOT_FOUND")` on missing snapshot. Imports the narrowed `validateUpdateInventoryInput`. |
| `apps/web/app/api/inventory/_validators.ts` | Rewritten per §5 (drop create, narrow update). |

### Knock-on (will compile-break — fixed in next sweep)

These will be left red on purpose. The next sweep is the modules/dashboard rewire and is the right time to update them:

- `apps/web/modules/imports/data/mutations.ts:33` — `updateImportInventoryRowsRequest` posts to `/api/imports/${id}/inventory-rows/section` and types itself with `InventoryRowsDiff`. Will need to be re-pointed to `/api/imports/${id}/staged-inventory-rows/section` and re-typed to `StagedInventoryRowsDiff` + the `{ import, rows, tempIdMap }` response.
- `apps/web/modules/imports/data/mutations.ts:9-15` — `createImportRequest` types itself with `CreateImportInput` from `@builders/application`. The shape changes (`transportType`/`status` removed, `manufacturerId` added). Field-level changes will surface in the controller.
- `apps/web/modules/inventory/data/mutations.ts` — any `createInventoryRequest` will lose its endpoint. Safe to delete in the next sweep along with the corresponding "create inventory row" UI gesture (which no longer exists conceptually).
- Any controllers (`apps/web/modules/imports/controllers/use-import-inventory-rows-section.ts` if it exists) that build the diff with `stockCount` will need `startingStock`.

These are not silent failures — `tsc -b` will surface them as the next sweep's punch list.

## 8. Verification

1. `npx tsc -b` from repo root: zero errors in `apps/web/app/api/**`, `packages/application`, `packages/domain`. Errors confined to `apps/web/modules/{imports,inventory}/data/mutations.ts` (intentional — see §7).
2. `npm run build:web` proceeds further than its current failure point. **Will still fail** because the modules/data layer references the deleted endpoints — that's expected and is the next sweep's gate.
3. Hand-test (curl or Postman) the routes against a local DB:
   - `POST /api/imports` with the new 5-field body → 201 with `{ import }`.
   - `PATCH /api/imports/[id]/primary/section` with `expectedUpdatedAt` → 200; stale `expectedUpdatedAt` → 409.
   - `PATCH /api/imports/[id]/staged-inventory-rows/section` with a `{ diff: { added, modified, deleted } }` body → 200 with `{ import, rows, tempIdMap }`.
   - `PATCH /api/inventory/[id]/primary/section` with one of the six allowed fields → 200; with `cost` in the body → silently dropped (still 200).
   - `DELETE /api/imports/[id]` and `DELETE /api/inventory/[id]` with stale `expectedUpdatedAt` → 409.
4. Re-run any one mutation with the same `idempotencyKey` → identical response, no second DB write.

## 9. Sequencing

1. Rewrite both `_validators.ts` files first — every route imports from them.
2. Rewrite `apps/web/app/api/inventory/route.ts` (drop POST) and `apps/web/app/api/inventory/[id]/**` routes — smallest diff, unblocks `apps/web` partial build.
3. Rewrite `apps/web/app/api/imports/route.ts` and `apps/web/app/api/imports/[id]/route.ts` + primary section.
4. Delete `apps/web/app/api/imports/[id]/inventory-rows/section/route.ts` and parent dirs.
5. Add `apps/web/app/api/imports/[id]/staged-inventory-rows/section/route.ts`.
6. Run `npx tsc -b` and confirm errors are confined to `apps/web/modules/**` (the next sweep's surface).

## 10. Out of scope (next sweep)

- `apps/web/modules/imports/**` and `apps/web/modules/inventory/**` — components, controllers, `data/mutations.ts`, `data/queries.ts`.
- `apps/web/app/dashboard/imports/**` and `apps/web/app/dashboard/inventory/**` page loaders.
- New `POST /api/imports/[id]/staged-inventory-rows/import` route (mark-staged-rows-for-import) — paired with its controller in the next sweep, per §6.
- The materialize use case has no HTTP route at all by design — only the worker's BullMQ processor consumes it. That stays the rule.
