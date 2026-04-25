# Opus 4.7 — Imports / Staged Inventory / Inventory Synthesis

What I think you're going for, after reading the sweep reports and verifying against the current code.

## The headline

You are converting a synchronous "user creates inventory rows" model into an **async, durable, idempotent producer/consumer pipeline** in which:

- An *import* is a working draft.
- Inventory is a **frozen historical artifact**, only ever created by a worker that materializes a staged batch.
- Every state transition that matters is gated by a status enum, a row-level lock, and an outbox event with a deterministic idempotency key.

The codebase is mid-rebuild, organized in tightly scoped sweeps, currently sitting between sweep 4b (application use cases done) and sweep 4c (relay topic + worker handler still missing).

## The state machine

`FlooringStagedInventoryRow.status: DRAFT → QUEUED → IMPORTED`

- **DRAFT** — user-editable. `STAGED_USER_EDITABLE_FIELDS` lists what they can touch. Diff-save flow uses `saveStagedInventoryRowsUseCase` with per-row `expectedUpdatedAt` checks.
- **QUEUED** — locked from edits. The mark-for-import action atomically flips DRAFT → QUEUED and writes one outbox event for the batch. Eligibility gates: row must be DRAFT, have a product, have a warehouse, have non-zero starting stock.
- **IMPORTED** — terminal. Worker has materialized it into a `FlooringInventory` row. The pair flip (insert inventory + flip QUEUED → IMPORTED) is one atomic transaction.

The legacy `isImported: boolean` on staged rows is kept as a "latch" but the authoritative state is now `status`. `FlooringInventory.isImported` is gone entirely — once a row is in inventory, by definition it was imported. The two representations are transitional.

## The producer (mark-for-import)

`markStagedRowsForImportUseCase` is the first production caller of `createQueueOutboxEvent`. It establishes the pattern:

1. Open `withDatabaseTransaction`.
2. `SELECT ... FOR UPDATE` on the parent import.
3. `validateStagedImportBatch(rows)` — domain-side eligibility check.
4. `markStagedRowsForImport(tx, ...)` — atomic DRAFT → QUEUED with strict throw on any `skippedRowIds` (no partial commits).
5. Build payload via `ImportMaterializeBatchPayloadSchema.parse(...)` with `version: "v1"`, sorted `stagedRowIds`, `requestedBy`, ISO `requestedAt`.
6. Deterministic idempotency key: `import-materialize:{importEntryId}:{sortedRowIds.join(",")}`.
7. `createQueueOutboxEvent` returns `{ event, wasDuplicate }`. The use case forwards both — duplicate calls (double-click, retry) resolve to the same event id and the UI is expected to no-op on `wasDuplicate: true`.

The outbox event's state mutation and the staged-row flip share a transaction, so partial failure rolls everything back.

## The consumer (materialize)

`materializeImportedStagedRowsUseCase` opens its own transaction (symmetric with every other use case in the repo — there's no parent waking up the worker). It:

1. Locks the parent import.
2. `listStagedInventoryForMaterialization(tx, { importEntryId, ids })` — filters to `status: "QUEUED"`, returns the unflattened Prisma payload so unit names, coverage-per-unit, and category slug survive.
3. Drift check: loaded length must equal requested length, otherwise `STAGED_MATERIALIZE_PRECONDITION_FAILED` (dead-letter signal — something raced or got deleted).
4. Field-by-field map onto `CreateInventoryRecordInput & { id, sourceStagedRowId }`:
   - Per-row pre-assigned UUID `id`.
   - Single shared `fifoReceivedAt` timestamp for the batch.
   - Snapshot fields from `product.category` at materialize time: stock unit, item-coverage unit, send unit (name + abbreviation each).
   - `costPerUnit` and `freightPerUnit` via `computeCostPerUnit` / `computeFreightPerUnit` domain helpers (null on null total or non-positive stock; `toFixed(2)` rounding).
   - `coveragePerUnit` snapshotted from the product, gated by `categorySupportsCoverageComputation`.
5. `materializeStagedRowsToInventory(tx, ...)` — bulk insert + flip QUEUED → IMPORTED in one shot. The DB sequence stamps `inventoryNumber`. `sourceStagedRowId` is a caller-side correlator, not a stored column.

Inventory rows are immutable historical records. Once materialized, the row carries the unit names, costs, and coverage **as they were at the time of import**. Future product changes can't retroactively alter inventory.

## The worker's exact materialize map (user-confirmed)

**Copied verbatim from the staged row:**
`importEntryId`, `productId`, `itemNumber`, `dyeLot`, `warehouseId`, `locationId`, `startingStock`, `cost`, `freight`, `notes`.

**Derived/looked up at materialize time and snapshotted onto the inventory row:**
- `costPerUnit`, `freightPerUnit` — via `computeCostPerUnit` / `computeFreightPerUnit` (domain).
- `categorySlug` — from `product.category`.
- All six unit fields — `stockUnitName/Abbrev`, `itemCoverageUnitName/Abbrev`, `sendUnitName/Abbrev` — from `product.category`.
- **`coveragePerUnit` — from the product itself, but only the 4 special categories accept and require it.** Other categories get null. This is the load-bearing snapshot — coverage balance is computed from it forever after.
- `fifoReceivedAt` — single shared timestamp for the batch.

**Editable on the inventory row post-materialization (the only six fields):**
`itemNumber`, `dyeLot`, `warehouseId`, `locationId`, `isArchived`, `notes`.

**Computed at read time on every inventory row:**
- `stockBalance = max(startingStock - totalCutSum, 0)` — `computeInventoryBalance`.
- `coverageBalance = stockBalance × coveragePerUnit` — `computeInventoryCoverage`, null for non-coverage categories.

`totalCutSum` is produced by cut logs (out of scope here, but the formula is shared).

## What was removed

`FlooringImportEntry.transportType` and `.status` were dropped. The "what state is this import in?" question is now answered by counting staged rows by status (`getImportLinkState`), not by a field on the import. `createInventoryUseCase` and `saveImportInventoryRowsUseCase` were both deleted — there is no user-facing inventory-create path. The inventory error union got pruned to 6 codes that match what the surviving use cases actually throw.

## The layer contract

You're holding a strict bottom-up boundary:

- **Prisma schema** — source of truth for shape. Sequences, enums, unique constraints, FKs.
- **Domain (`@builders/domain`)** — pure types and Zod payload schemas (the outbox payload is a domain artifact, not an application one), validators, predicates, computed math, error code unions, message builders co-located with predicates.
- **Data (`@builders/db`)** — Prisma primitives. Per-row CRUD uses the `*Record` suffix. Batch primitives (`applyStagedInventoryRowsDiff`, `markStagedRowsForImport`, `materializeStagedRowsToInventory`) are transaction-only — they don't accept a default client. `isP2002` lives here so both layers can use it.
- **Application (`@builders/application`)** — use cases. Each opens `withDatabaseTransaction`, does its lock-load-validate-mutate orchestration, returns a record. No business rules; no SQL.
- **Routes** — own parent-level `expectedUpdatedAt` (sweep 4b explicitly punted this). They live in `apps/web/app/api/...` and don't exist yet for staged-inventory operations.
- **Worker** — consumes outbox events. Doesn't exist yet for `flooring.imports.materialize`.

## Where you actually are

Done:
- Schema, enum, sequence
- Domain types + payload schema + validators + computed helpers
- Data primitives (read + write, including batch + outbox)
- Application use cases for both producer and consumer sides

Not done:
- **Sweep 4c** — relay needs `flooring.imports.materialize` in its topic registry; worker needs a BullMQ handler that calls `materializeImportedStagedRowsUseCase`. Right now the producer would write events that go to `EXHAUSTED` with "Unsupported outbox topic" because the relay hard-codes work-order allocation. Until 4c lands, no apps/web route should expose `markStagedRowsForImportUseCase`.
- **Sweep 5** — apps/web. Routes for diff-save and mark-for-import. UI cleanup of `transportType` / `status` / `isImported` references that are still scattered across `apps/web/modules/imports/`.
- **Cut-logs sweep** — separate scope, but the `"VOIDED"` → `"VOID"` enum issue at `packages/db/src/flooring/inventory/cut-logs/write-repository.ts:149` blocked dist emission at one point. Worth tracking.

## What this all adds up to

You are building a flooring inventory system whose core invariant is **"inventory is what the worker materialized, full stop."** Everything upstream — drafts, validation, queueing, idempotency — exists to make sure the materialization step receives a clean, locked, validated batch and produces a frozen snapshot. The two-phase commit pattern (FOR UPDATE + outbox + status enum) is your durability story; the snapshotting at materialize time is your audit story; the deterministic idempotency key is your "users will double-click" story.

The remaining work is the connective tissue (worker handler, routes, UI) — the contract is already in place.
