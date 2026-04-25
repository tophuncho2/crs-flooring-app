# Sweep 4b — Staged Inventory Rows Application Layer Report

## Summary

Built the application layer for staged inventory rows: three new use cases
(`saveStagedInventoryRowsUseCase`, `markStagedRowsForImportUseCase`,
`materializeImportedStagedRowsUseCase`) plus four supporting changes in
the lower layers (`isP2002` move into `@builders/db`, P2002 catch +
`{ event, wasDuplicate }` return shape on `createQueueOutboxEvent`, the
new `listStagedInventoryForMaterialization` data-layer read primitive,
and the new `computeCostPerUnit` / `computeFreightPerUnit` domain
helpers). `npm run build` succeeds clean for all three packages and
`npx tsc --noEmit` against `packages/application` is silent. The
producer side of the materialize flow now writes outbox events; the
relay/worker consumer side remains sweep 4c's territory.

## 1. Per-file delta

| File | Change | Kind |
|---|---|---|
| `packages/db/src/shared/prisma-errors.ts` | New file: `isP2002` helper, exact-copy of the previous application-layer body. | new |
| `packages/db/src/index.ts` | Added `export * from "./shared/prisma-errors.js"` so the helper is reachable through `@builders/db`. | modify |
| `packages/db/src/queues/outbox-repository.ts` | Imported `isP2002` from `../shared/prisma-errors.js`. Changed `createQueueOutboxEvent` return type to a new `CreateQueueOutboxEventResult` (`{ event, wasDuplicate }`) and wrapped the `create` call in a try/catch that re-reads on P2002 against `idempotencyKey`. | modify |
| `packages/db/src/flooring/imports/staged-inventory-rows/read-repository.ts` | Imported `Prisma` (transaction-client typing). Added `listStagedInventoryForMaterialization(tx, { importEntryId, ids })` returning the raw `StagedInventoryRowPayload[]` filtered to `status: "QUEUED"`. Transaction-only — no `client = db` default. | modify |
| `packages/domain/src/flooring/inventory/computed.ts` | Added `computeCostPerUnit({ cost, startingStock })` and `computeFreightPerUnit({ freight, startingStock })`. Both null on null total or non-positive stock; otherwise `(value / stock).toFixed(2)`. Match the existing `toFixed(2)` decimal-string convention. | modify |
| `packages/application/src/shared/prisma-errors.ts` | Replaced body with `export { isP2002 } from "@builders/db"`. All existing `import { isP2002 } from "../../shared/prisma-errors.js"` sites continue to resolve. | modify |
| `packages/application/src/flooring/imports/staged-inventory-rows/errors.ts` | New file. `StagedInventoryErrorCode` union with the 7 `STAGED_*` codes from the locked-in plan; `StagedInventoryExecutionError` mirrors `ImportExecutionError` shape verbatim. | new |
| `packages/application/src/flooring/imports/staged-inventory-rows/types.ts` | New file. Input types (`SaveStagedInventoryRowsInput`, `MarkStagedRowsForImportInput`) and result types (`SaveStagedInventoryRowsResult`, `MarkStagedRowsForImportResult`, `MaterializeImportedStagedRowsResult`). Reuses `StagedInventoryRecord` and `StagedInventoryRowsDiff` from the lower layers. | new |
| `packages/application/src/flooring/imports/staged-inventory-rows/save-staged-inventory-rows.ts` | New file. Diff-save use case. `withDatabaseTransaction` → `SELECT ... FOR UPDATE` parent → `getImportById` → load existing rows → assert per-row `expectedUpdatedAt` → resolve location lookup + product universe → `validateStagedInventoryRowsDiff` → `assignStagedInventoryDiffIds` → `applyStagedInventoryRowsDiff`. | new |
| `packages/application/src/flooring/imports/staged-inventory-rows/mark-staged-rows-for-import.ts` | New file. Import-batch use case + first outbox writer. `withDatabaseTransaction` → `SELECT ... FOR UPDATE` parent → `getImportById` → load + filter requested rows → `validateStagedImportBatch` → `markStagedRowsForImport` (strict throw on `skippedRowIds`) → `ImportMaterializeBatchPayloadSchema.parse` → deterministic key `import-materialize:{importEntryId}:{sortedRowIds}` → `createQueueOutboxEvent`. | new |
| `packages/application/src/flooring/imports/staged-inventory-rows/materialize-imported-rows.ts` | New file. Worker-facing use case. `withDatabaseTransaction` → `SELECT ... FOR UPDATE` parent → `listStagedInventoryForMaterialization` → drift check (length mismatch ⇒ `STAGED_MATERIALIZE_PRECONDITION_FAILED`) → field-by-field map onto `CreateInventoryRecordInput + { id, sourceStagedRowId }` (per-row UUID, single shared `fifoReceivedAt`, snapshot unit fields, `coveragePerUnit` from product, `costPerUnit` / `freightPerUnit` via the new domain helpers) → `materializeStagedRowsToInventory`. | new |
| `packages/application/src/flooring/imports/staged-inventory-rows/index.ts` | New file. Barrel exporting `errors`, `types`, and the three use case modules. | new |
| `packages/application/src/flooring/imports/index.ts` | Added `export * from "./staged-inventory-rows/index.js"` while preserving the existing five lines (`errors`, `types`, `create-import`, `update-import`, `delete-import`). | modify |

Total: 6 new files + 7 modified files. (One more modification than the
12 cited in the plan — `packages/db/src/index.ts` needed an explicit
`export * from "./shared/prisma-errors.js"` line because there was no
existing `shared/` barrel to absorb it. See §8.)

## 2. New exports

**`@builders/db`:**
- `isP2002(error, targetColumn?)`
- `CreateQueueOutboxEventResult` (type)
- `listStagedInventoryForMaterialization(tx, { importEntryId, ids })`

**`@builders/domain`:**
- `computeCostPerUnit({ cost, startingStock })`
- `computeFreightPerUnit({ freight, startingStock })`

**`@builders/application`:**
- `StagedInventoryErrorCode` (type)
- `StagedInventoryExecutionError` (class)
- `SaveStagedInventoryRowsInput` (type)
- `SaveStagedInventoryRowsResult` (type)
- `MarkStagedRowsForImportInput` (type)
- `MarkStagedRowsForImportResult` (type)
- `MaterializeImportedStagedRowsResult` (type)
- `saveStagedInventoryRowsUseCase(importEntryId, diff, client?)`
- `markStagedRowsForImportUseCase(importEntryId, stagedRowIds, requestedBy, client?)`
- `materializeImportedStagedRowsUseCase(payload, client?)`

## 3. Symbols modified in lower layers

- **`createQueueOutboxEvent`** — return shape changed from
  `Promise<QueueOutboxEventRecord>` to
  `Promise<CreateQueueOutboxEventResult>` (`{ event, wasDuplicate }`).
  Now catches `P2002` against the `idempotencyKey` column and re-reads
  the existing event so duplicate writes resolve idempotently. Verified
  zero callers existed before this sweep (grep confirmed only the
  definition site); the only new caller is
  `markStagedRowsForImportUseCase`.
- **`isP2002`** — body relocated from
  `packages/application/src/shared/prisma-errors.ts` to
  `packages/db/src/shared/prisma-errors.ts`. The application-layer file
  is now a one-line re-export, so the existing import sites in
  `management/`, `flooring/warehouses/`, and `flooring/products/`
  continue to resolve unchanged.
- **`listStagedInventoryForMaterialization`** — new transaction-only
  read primitive. Returns the raw `StagedInventoryRowPayload` (full join
  graph) instead of the normalized record so the materialize use case
  can read unit abbreviations and `product.coveragePerUnit` that the
  normalizer flattens. Filters by `status: "QUEUED"` so drift is
  silently excluded — caller compares lengths and dead-letters on
  mismatch.
- **`computeCostPerUnit` / `computeFreightPerUnit`** — pure decimal
  helpers in `packages/domain/src/flooring/inventory/computed.ts`.
  String inputs, `string | null` outputs, `toFixed(2)` rounding —
  matches the existing `computeInventoryBalance` /
  `computeInventoryCoverage` style.

## 4. Build results

```
$ npm run build --workspace=packages/domain
> @builders/domain@0.1.0 build
> tsc -p tsconfig.json
[clean exit]

$ npm run build --workspace=packages/db
> @builders/db@0.1.0 build
> npm run db:generate && tsc -p tsconfig.json
✔ Generated Prisma Client (v6.12.0)
[clean exit]

$ npm run build --workspace=packages/application
> @builders/application@0.1.0 build
> tsc -p tsconfig.json
[clean exit]

$ cd packages/application && npx tsc --noEmit
[clean exit, zero output]
```

## 5. tsc diff vs sweep 4a baseline

`npx tsc -b` from repo root: 170 errors, all in `apps/web/` — flat vs
sweep 4a's reported baseline. Zero errors in any `packages/*` workspace.
The 35 distinct `apps/web/*` files emitting errors are the same set of
record-panel / work-order modules sweep 4a flagged as untouched (they
predate the staged-inventory work and are scheduled for the apps/web
sweep).

## 6. Symbol reachability

```
$ node -e "import('@builders/application').then(m => console.log(...))"
saveStagedInventoryRowsUseCase: function
markStagedRowsForImportUseCase: function
materializeImportedStagedRowsUseCase: function
StagedInventoryExecutionError: function

$ node -e "import('@builders/db').then(m => console.log(...))"
listStagedInventoryForMaterialization: function
isP2002: function

$ node -e "import('@builders/domain').then(m => console.log(...))"
computeCostPerUnit: function
computeFreightPerUnit: function
```

All eight new symbols import cleanly. The `wasDuplicate` field on
`createQueueOutboxEvent`'s return is type-checked at the use case site
(`mark-staged-rows-for-import.ts` destructures
`{ event, wasDuplicate }` and forwards both to the result).

## 7. The first outbox-write precedent

`markStagedRowsForImportUseCase` is the first production caller of
`createQueueOutboxEvent`. Pattern for future outbox-writing use cases:

1. **Same transaction as the state mutation.** The use case opens
   `withDatabaseTransaction`, calls the state-flip primitive
   (`markStagedRowsForImport`), and writes the outbox event with the
   same `c` client. If the outbox insert fails, the state flip rolls
   back.
2. **Strict race handling.** A non-empty `skippedRowIds` from the
   primitive throws `STAGED_BATCH_RACE` (409) — no partial writes, no
   silent drops. Per locked-in decision 3.
3. **Deterministic idempotency key.** Format
   `import-materialize:{importEntryId}:{sortedRowIds.join(",")}`. Row
   ids are sorted before joining so callers that pass the same set in
   different orders collide on the same key. Sort is also applied to
   the `payloadJson` itself so consumers see a canonical order.
4. **Defensive Zod parse on the payload.** The producer calls
   `ImportMaterializeBatchPayloadSchema.parse({ version, topic,
   importEntryId, stagedRowIds, requestedBy, requestedAt })` before
   the insert — guarantees the consumer (sweep 4c worker) receives a
   shape it can immediately re-parse without runtime drift. (Note: the
   sweep prompt's literal payload-shape example omitted the
   `version: "v1"` field; the actual Zod schema requires it, so the
   use case includes it. See §8.)
5. **Two return fields surface duplicate behavior.** The use case
   forwards both `outboxEventId: event.id` and `wasDuplicate` to its
   caller. `wasDuplicate` is true when the insert raced an earlier
   call against the same key; the existing event is re-read and
   returned so callers can still respond with a stable event id.
6. **No telemetry / no logging.** Application layer stays agnostic. The
   relay (sweep 4c) is the layer that observes `wasDuplicate` for
   metrics; producers just forward it.

## 8. Deviations from the plan

- **`packages/db/src/index.ts` got an extra line.** The plan says
  "ensure `packages/db/src/index.ts` re-exports it via `export * from
  "./shared/prisma-errors.js"` if a `shared/` barrel doesn't already
  exist." There was no `shared/` barrel and no existing `shared/*` file
  — the directory existed but was empty. Added the re-export line
  directly. This is the 7th modified file (vs the plan's 6); the file
  count is `6 new + 7 modified = 13` rather than `12`.
- **`ImportMaterializeBatchPayloadSchema` requires `version: "v1"`.**
  The plan's payload-construction snippet omits `version`, but the
  schema (defined in sweep 1's
  `domain/src/flooring/imports/staged-inventory-rows/import-batch-payload.ts`)
  has `version: z.literal("v1")` and would reject a payload without
  it. The use case includes the literal `version: "v1"` in the parse
  input. No structural deviation — the producer-side `.parse()` is the
  guarantee the prompt asked for.
- **`stagedRowIds` are sorted in the payload, not just in the
  idempotency key.** The plan only specifies sorting for the
  idempotency key. Sorting also in the payload means downstream
  workers see a canonical row order, which simplifies replay /
  diffing. This is a strict superset of the plan's behavior — the
  idempotency key is still order-independent, and the payload still
  type-checks. If a future sweep requires preserving the original
  caller order, the payload sort can be removed without breaking the
  key.
- **`saveStagedInventoryRowsUseCase` uses `listProducts(c)` to
  populate `knownProductIds`.** The plan suggests the resolution shape
  should include "known product IDs" without prescribing the lookup.
  `listProducts` is the only available bulk read — there is no
  `listProductsByIds` primitive. For typical staged-row diffs (≤ 500
  rows, well under the product universe size), this is fine; if the
  product universe grows beyond a few thousand the use case should
  switch to a targeted `findMany({ where: { id: { in: [...] } } })`
  primitive (out of scope for this sweep).
- **`itemNumber` in `assertRowVersions` skips per-row when the staged
  row no longer exists.** The plan says "find the matching existing
  row by id; if `existing.updatedAt !== entry.expectedUpdatedAt`,
  throw." If the row doesn't exist (raced delete), the version check
  is skipped — the diff validator's existing-row resolution handles
  the "deleted under us" case. The behavior matches the deleted
  `assertRowVersions` precedent in the old `save-import-inventory-rows`
  file.
- **`DiffExistingStagedInventoryRow` shape.** The plan suggests
  including `status` and `updatedAt` in this domain type. The actual
  domain type (already established in sweep 1) is exactly
  `{ id, productId, itemNumber, locationId, warehouseId, isImported }`
  — the use case maps to this canonical shape. Per-row staleness is
  enforced separately by `assertRowVersions` before the validator
  runs.

## 9. Sequencing constraint

**Sweep 4c must land before any sweep 5 route calls
`markStagedRowsForImportUseCase`**, otherwise the relay would either:

- Not exist yet, leaving the outbox event sitting at `PENDING`
  indefinitely with no dispatcher (acceptable — the state flip is
  durable and a future relay will pick it up), **or**
- Exist but lack the `flooring.imports.materialize` topic in its
  registry, terminally exhausting events with "Unsupported outbox
  topic" (not acceptable — the events would EXHAUST and need manual
  re-queue).

The current state is the first case: the producer writes events to a
topic no relay knows. Until sweep 4c brings the relay's topic registry
+ the worker's materialize handler online, no apps/web route should
expose the producer.

## 10. Remaining work flagged for sweep 4c

1. **Relay topic registry refactor** — add
   `flooring.imports.materialize` as a recognized topic so events for
   it are routed to the worker queue rather than terminally exhausted.
2. **Worker materialize handler** — BullMQ job handler that:
   - Parses job data via `parseImportMaterializeBatchPayload`.
   - Calls `materializeImportedStagedRowsUseCase(payload)` — the use
     case opens its own transaction (per locked-in decision A).
   - Classifies thrown `StagedInventoryExecutionError` as non-retryable
     (dead-letter) and Prisma infrastructure errors as retryable.
   - Optionally writes a follow-up outbox event ("import completed")
     once materialization succeeds — out of scope unless apps/web
     needs the notification.
3. **Dead work-order auto-allocation cleanup** — flagged in the audit
   as orphaned code in the relay/worker registry; prune as part of the
   topic-registry refactor.
4. **Outbox event observability** — relay-side metrics for
   `wasDuplicate` rates so we can detect badly-pluralized callers.

## 11. Remaining work flagged for sweep 5

1. **`apps/web/` route for `saveStagedInventoryRowsUseCase`** —
   diff-save endpoint backing the staged-rows section of the import
   record view. Route layer owns parent `expectedUpdatedAt` (per
   locked-in decision 5) and the broader Prisma error translation.
2. **`apps/web/` route for `markStagedRowsForImportUseCase`** — the
   "queue these N rows for import" action button. Route layer maps
   `STAGED_BATCH_INELIGIBLE` and `STAGED_BATCH_RACE` to user-facing
   toasts, surfaces the `outboxEventId` in the response so the UI can
   poll for completion. Must NOT ship before sweep 4c.
3. **UI surface for `wasDuplicate`** — when a user double-clicks the
   import button, the second call returns `wasDuplicate: true` with
   the same `outboxEventId`. The UI should treat this as a no-op
   ("import already queued") rather than an error.
4. **Polish for the materialize-completion signal** — once sweep 4c
   adds an emit on successful materialization, the apps/web import
   record view should react to it (e.g. moving rows from "Queued" to
   "Imported" without a manual refresh).
