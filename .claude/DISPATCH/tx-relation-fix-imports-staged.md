# tx-relation-fix-imports-staged — Stop multi-relation reads from wedging the pinned transaction connection in imports/staged

## How to use this brief (receiving session, read first)
You were handed this file in a fresh worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/session-new` to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode: PLAN mode → produce a plan and STOP for approval; AUTO mode → execute. Either way, research-and-validate BEFORE acting.

## Intent for this session
On the Prisma pg driver adapter, a read/write whose `select`/`include` pulls 2+ relations — when run on an interactive-transaction client (the `tx` from `withDatabaseTransaction`, a single pinned connection) — makes Prisma fire concurrent relation sub-queries on that one connection, which node-postgres rejects with "client is already executing a query" → 500 + a wedged connection. A `Promise.all` of separate queries on a `tx` client is a second, independent trigger of the same failure. This session applies the proven fix across the imports/staged use cases: transactions do locks + writes + LEAN (relation-free) reads only; the full multi-relation record is read on the POOL (the default `db`, no `tx`) AFTER the transaction commits; existence/validation reads move to the pool; any `Promise.all` that must stay on a `tx` is serialized. No schema change, no migration.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ THE key empirical gap: `_count` subquery behavior. `importRowSelect` includes `_count:{select:{stagedInventoryRows, inventories}}` (packages/db/src/imports/shared.ts:15), and `getImportLinkState` / `getImportDeleteState` are pure `_count`-of-2 reads used in-tx (update-import.ts:90, delete-import.ts:23). It is UNKNOWN whether Prisma 7 + @prisma/adapter-pg fires `_count` as concurrent subqueries on a pinned connection. Reproduce empirically on a tx client. If it trips → replace with a serialized/raw count kept in-tx under the lock; if safe → leave untouched.
- ⚑ Composition (`client`) case for the post-commit pool enrich: these use cases accept `client?` and do `c = client ?? tx`. A pool enrich (no client) won't see a composing caller's uncommitted writes. The reference precedent accepts this (it reads the pool unconditionally). Decide: mirror the precedent (unconditional pool read) vs. read on `c` when a client was passed. No in-scope use case is currently called WITH a client, so this is theoretical today — but pick a rule and apply it consistently.
- ⚑ mark-staged validation placement: pool pre-read (matches the section-save precedent; the race is already guarded by the in-tx DRAFT re-check → STAGED_BATCH_RACE 409) vs. a lean in-tx read under the lock. Confirm comfort relying on the existing race guard before moving the validation read to the pool.
- ⚑ `getImportById` existence-only call at mark-staged-rows-for-import.ts:44 discards the payload (only `if(!parent)`). Confirm no near-future need for parent fields before swapping it to a lean existence read.
- ⚑ Tests: the imports + staged use-case tests mock `@builders/db`. Add the new lean helpers to those mocks and assert the pool enrich / pool reload ORDERING (i.e. the full read happens after the transaction resolves, on the pool). Mirror how the reference module's create/update tests were updated.

## Scope
In: Convert every in-tx multi-relation read in the imports/staged use cases to either (a) a lean relation-free read that stays in-tx, or (b) a full read moved to the pool (post-commit enrich, or pre-tx validation). Serialize/relocate the one in-tx `Promise.all`. Add the small lean helpers/selects needed. Code-only.
Out: No schema edit, no migration, no behavior change beyond fixing the wedge. Do NOT touch any module other than imports/staged. Do NOT edit the reference precedent module or any shared guard helper (see envelope below).

## Files you own (do not edit anything outside this list)
- packages/db/src/imports/read-repository.ts — add lean `getImportPrimaryStateById`; repoint `listStagedInventoryForMaterialization` at a new lean select
- packages/db/src/imports/write-repository.ts — make `createImportRecord` / `updateImportRecord` return lean `{id}` (drop their in-tx `getImportById` re-reads)
- packages/db/src/imports/shared.ts — reference for `importRowSelect` / `_count` (only if the `_count` flag forces a change)
- packages/db/src/imports/staged-inventory-rows/** — add `stagedInventoryMaterializeSelect` + its GetPayload type to shared.ts here; leave write-repository.ts as-is (no live in-tx caller)
- packages/db/src/imports/staged-inventory-filter-rows/** — reference only (no live in-tx caller); do not edit unless research proves otherwise
- packages/db/src/imports/staged-inventory-section/write-repository.ts — drop step-7 reload (lines ~218-224); `applyImportStagedInventorySectionDiff` returns only the temp-id maps
- packages/application/src/imports/create-import.ts — enrich `getImportById(id)` on the pool post-commit
- packages/application/src/imports/update-import.ts — lean in-tx merge read; pool post-commit enrich; `_count` flag
- packages/application/src/imports/delete-import.ts — `_count` flag only
- packages/application/src/imports/staged-inventory-rows/mark-staged-rows-for-import.ts — move existence + validation reads to the pool pre-tx
- packages/application/src/imports/staged-inventory-rows/materialize-imported-rows.ts — repoint to the lean materialize select (stays in-tx)
- packages/application/src/imports/staged-inventory-section/save-import-staged-inventory-section.ts — pool post-commit `Promise.all` reload
- packages/application/tests/** (imports + staged use-case tests) — mock the new lean helpers; assert pool enrich/reload ordering
- packages/db tests for the above (if any) — keep green

## Layer-by-layer map

Data (packages/db)
- read-repository.ts — add `getImportPrimaryStateById(id, client=db): {purchaseOrderNumber, internalNotes, warehouseId, entityId, color} | null` — a relation-free scalar `findUnique`, alongside `getImportById` (~:76).
- read-repository.ts:98-111 — repoint `listStagedInventoryForMaterialization` from `stagedInventoryRowSelect` (5 relations) to a new lean `stagedInventoryMaterializeSelect` (scalars + `importEntry:{select:{warehouseId:true}}` = 1 relation → safe in-tx).
- staged-inventory-rows/shared.ts — add `stagedInventoryMaterializeSelect` + its GetPayload type.
- write-repository.ts:61-79 — `createImportRecord`: drop the in-tx `getImportById` at ~:76; return lean `{id}`.
- write-repository.ts:81-109 — `updateImportRecord`: drop the in-tx `getImportById` at ~:106; return lean `{id}`.
- staged-inventory-section/write-repository.ts:133-225 — `applyImportStagedInventorySectionDiff(tx,input)`: keep writes (steps 1-6), build `filterTempIdMap` / `rowTempIdMap` from input (no read), DELETE step 7 reload (lines ~218-224), return only `{filterTempIdMap, rowTempIdMap}`.

Application (packages/application)
- create-import.ts:25 — after `withDatabaseTransaction` resolves with the lean `{id}`, enrich via `getImportById(id)` on the POOL (no client) and return that.
- update-import.ts:37 — (a) replace the in-tx validation read at :50 (`getImportById(id,c)`, multi-relation) with the new lean `getImportPrimaryStateById(...)` used in-tx for the merge (it needs only purchaseOrderNumber/internalNotes/warehouseId/entityId/color — all scalar); (b) `updateImportRecord` now returns `{id}` → enrich `getImportById(id)` on the POOL post-commit; (c) `getImportLinkState` `_count`-of-2 at :90 → gated on the `_count` flag.
- delete-import.ts:14 — `getImportLinkState` `_count`-of-2 at :23: no relational-select hazard; touch ONLY if the `_count` flag proves it trips.
- staged-inventory-rows/mark-staged-rows-for-import.ts:29 — (a) existence check at :44 (`getImportById`, payload unused) → move to a lean POOL read pre-tx (lean existence read or reuse `getImportPrimaryStateById`); (b) `listStagedInventoryByImport` at :54 (`stagedInventoryRowSelect`, 5 relations) feeding `validateStagedImportBatch` → run on the POOL BEFORE opening the tx. KEEP the lock + `markStagedRowsForImport` + `stampImportActor` + outbox in-tx; the in-tx `markStagedRowsForImport` already re-checks `status:"DRAFT"` under the lock and returns `skippedRowIds` → STAGED_BATCH_RACE (409), so the race is handled.
- staged-inventory-rows/materialize-imported-rows.ts:19 — `listStagedInventoryForMaterialization` at :60 now uses the lean materialize select (worker consumes only scalars + `importEntry.warehouseId`). KEEP it in-tx (under the parent lock, writes follow). No pool move, no pool enrich — worker-internal read, not a response.
- staged-inventory-section/save-import-staged-inventory-section.ts:42 — after `withDatabaseTransaction` resolves (now returning `{filterTempIdMap, rowTempIdMap}`), run `Promise.all([listFilterRowsByImport(input.importEntryId), listStagedInventoryByImport(input.importEntryId)])` on the POOL (no client arg), then return `{filterRows, stagedRows, filterTempIdMap, rowTempIdMap}`. The response type `SaveImportStagedInventorySectionResult` (staged-inventory-section/types.ts:12-17) needs the FULL relation rows (the client reconciles local state; the route returns the result verbatim at section/route.ts:47-48) — which is exactly why this reload must produce full records on the pool, NOT lean in-tx.
- In-module precedent to mirror: save-import-staged-inventory-section.ts:55 already does `const reader = client ?? db` to run validation reads on the pool (see comments at :49-55 and :207-210); and the pooled `Promise.all` of the two staged lists is already done safely at apps/web/app/api/imports/[id]/staged-inventory/route.ts:32-35 (READ reference only — do not edit that route).

Reference precedent (READ for the pattern — do NOT edit)
- Lean in-tx read helper: `getInventoryMutableStateById` (packages/db/src/inventory/read-repository.ts:234-242).
- Write fns returning lean `{id}`: packages/db/src/inventory/write-repository.ts.
- Post-commit pool enrich: `getInventoryById(id)` with no client (packages/application/src/inventory/update-inventory.ts:81).

Tests
- Update the imports + staged use-case tests (mock `@builders/db`) to register the new lean helpers and assert the pool enrich / pool reload happens after the transaction resolves. Mirror the reference module's create/update test updates.

Not-a-concern (verified no in-tx caller — do NOT refactor, just never hand them a `tx`)
- `createStagedInventoryRecord` / `updateStagedInventoryRecord` (staged-inventory-rows/write-repository.ts:57, :123) and the filter equivalents (staged-inventory-filter-rows/write-repository.ts:37, :89) each do write + full 5-relation re-read, but have no live application/route caller.

## Migration (if schema changes)
None — code-only change; no schema edit, no migration.

## Done means
- /check-gauntlet green (build + typecheck + lint + test)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
