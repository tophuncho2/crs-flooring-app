# tx-relation-fix-adjustments-payments — stop multi-relation reads/writes from running on the pinned transaction connection in the adjustments + payments use cases

## How to use this brief (receiving session, read first)
You were handed this file in a fresh worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/session-new` to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode: PLAN mode → produce a plan and STOP for approval; AUTO mode → execute. Either way, research-and-validate BEFORE acting.

## Intent for this session
On the Prisma pg driver adapter, a read or write whose `select`/`include` pulls 2+ relations — or a `Promise.all` of separate queries — run on an interactive-transaction client (`tx` from `withDatabaseTransaction`, a single pinned connection) makes Prisma fire concurrent sub-queries on that one connection, which node-postgres rejects with "client is already executing a query" → 500 + a wedged connection. This session hardens the six adjustments + payments use cases so their transactions do locks, writes, and LEAN (relation-free) reads only, then read the full multi-relation record on the POOL after commit, and serialize the one `Promise.all` that must stay on the tx. There is a proven, already-shipped precedent for exactly this shape in a sibling module (cited below) — mirror it head-to-toe.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ Payment pool-enrich read: reuse `getPaymentDetailById(id, { withNeighbors: false })` (packages/db/src/payments/read-repository.ts:150 — includes `paymentLinksInclude` + `projectPaymentLinks`, returns `PaymentDetail`, a structural superset of `Payment`, zero new code) vs add a dedicated `getPaymentByIdWithLinks(id): Payment` (clean return type matching `PaymentUseCaseResult`, avoids leaking neighbor fields). Either MUST project `paymentLinksInclude` — never the bare `getPaymentById` (read-repository.ts:112), which does a `findUnique` with NO include so `normalizePayment` nulls the link fields (normalizers.ts:56-60), dropping `entityName`/`workOrderLabel`/`paymentPurposeName` = regression.
- ⚑ Adjustment mutation read shape: new relation-free `getAdjustmentMutableStateById` + reuse `getInventoryParentContextForAdjustments` (recommended), deleting `getAdjustmentWithInventoryForMutation` — vs slimming that function to `inventory.unit` only (rejected: still chained relations on the tx).
- ⚑ Read inventory context before vs after the lock: today `getAdjustmentWithInventoryForMutation` runs BEFORE `lockInventoryForAdjustment` in update (:41 vs :94) and delete (:34 vs :73); `create-adjustment` reads context AFTER the lock (the more correct pattern). Decide whether to move the context read after the lock to match create — verify no test asserts the old ordering.
- ⚑ `netDeducted` threading for update: choose the carrier shape out of the tx so ONE post-commit enrich serves both the metadata-only path (`inventory.currentNetDeducted`) and the chain-touched path (`result.netDeducted`).
- ⚑ `getAdjustmentMutableStateById` MUST return `updatedAt` as an ISO string and `quantity` as a string (OCC + form-validate depend on it) — verify against the existing normalizer before finalizing the shape.
- ⚑ Tests are behavioral rewrites, not mechanical: the payments create/update tests assert `toBe(created/updated)`; after the fix the use case returns the POOL enrich, so those must mock the new links-projecting pool read and assert against THAT. Mirror how the sibling module's create/update tests were updated (see precedent below).
- ⚑ No db-layer unit tests exist today for the adjustments/payments write-repo or the recompute — consider a focused test for the serialize change.

## Scope
In: Make the six adjustments + payments use cases tx-safe — LEAN writes returning `{id}`, relation-free in-tx reads, full-record enrich on the POOL after commit, and serialize the one `Promise.all` inside `recomputeAndPersistNetDeducted`. Update the owning db read/write repos + application use cases + their tests. No behavior change beyond fixing the wedged-connection bug.

Out: No schema change, no migration. Do not touch any module other than adjustments/payments. Do not touch the shared `paymentLinksInclude` projection (READ-shared). Do not touch the sibling reference-precedent module's files (read them for the pattern only). Do not touch the shared guard helpers.

## Files you own (do not edit anything outside this list)
- `packages/db/src/inventory/adjustments/read-repository.ts` — add lean `getAdjustmentMutableStateById`; de-relation or delete `getAdjustmentWithInventoryForMutation`
- `packages/db/src/inventory/adjustments/write-repository.ts` — lean returns for `insertAdjustmentRow` + `updateAdjustmentRow`; serialize the `Promise.all` in `recomputeAndPersistNetDeducted`
- `packages/db/src/inventory/adjustments/shared.ts`, `order-by.ts`, `locks.ts`, `index.ts` — only as needed to export/support the above
- `packages/db/src/payments/read-repository.ts` — reuse or add the links-projecting pool-enrich read (Flag 1)
- `packages/db/src/payments/write-repository.ts` — lean returns for `createPaymentRecord` + `updatePaymentRecord` (drop the `include`)
- `packages/db/src/payments/normalizers.ts` — only if the chosen enrich read needs it
- `packages/db/src/payments/index.ts` — barrel exports as needed
- `packages/db/src/payments/payment-links.ts` — READ-SHARED: you may ADD a new read helper that consumes it, but DO NOT change `paymentLinksInclude`
- `packages/application/src/inventory/adjustments/create-adjustment.ts` — restructure: lean write + tx returns lean carrier + pool enrich after commit
- `packages/application/src/inventory/adjustments/update-adjustment.ts` — same, both the chain path and the metadata-only early-return path
- `packages/application/src/inventory/adjustments/delete-adjustment.ts` — swap the multi-relation mutation read for the lean pair; no record enrich needed
- `packages/application/src/payments/create-payment.ts`, `update-payment.ts` — lean write + pool enrich
- `packages/application/src/payments/delete-payment.ts` — SAFE as-is (delete, no include); leave
- Adjustments + payments test files under `packages/application/tests/**` (and any under `packages/db/**`)

## Layer-by-layer map

### Reference precedent (already shipped in a sibling module — READ, DO NOT EDIT)
- Lean in-tx read helper: `getInventoryMutableStateById` — packages/db/src/inventory/read-repository.ts:234
- Write fns return lean `{id}`: packages/db/src/inventory/write-repository.ts
- Post-commit POOL enrich (`getInventoryById(id)`, no client): packages/application/src/inventory/update-inventory.ts:81 (and create-inventory.ts)
- Its tests were updated to mock the lean helper + assert the pool-enrich order — use them as the template for your test rewrites.

### Data — adjustments
- packages/db/src/inventory/adjustments/write-repository.ts:104 `insertAdjustmentRow` → `create` at :108 uses `select: adjustmentRowSelect` (4 rel). Change to `select: { id: true }`, drop `normalizeAdjustmentRow`, narrow return to `Promise<{ id: string }>`.
- packages/db/src/inventory/adjustments/write-repository.ts:205 `updateAdjustmentRow` → both the `update` at :246 and the `findUniqueOrThrow` at :251 use `select: adjustmentRowSelect`. Change both branches to `select: { id: true }`, narrow return to `Promise<{ id: string }>`.
- packages/db/src/inventory/adjustments/write-repository.ts:313-319 `recomputeAndPersistNetDeducted` — the `Promise.all` fires two independent relation-free queries on the tx: (1) `listAdjustmentsForInventoryIds(inventoryIds, tx)` (read-repository.ts:564, scalar-only) and (2) `tx.flooringInventory.findMany({ where: { id: { in } }, select: { id, startingStock } })`. FIX: await them sequentially (no data dependency, order irrelevant to correctness). The per-inventory update loop (:340) and per-row before/after update loop (:363) already await sequentially in `for` loops (NOT `Promise.all`) — leave as-is.
- packages/db/src/inventory/adjustments/read-repository.ts — ADD `getAdjustmentMutableStateById(id, client = db)` mirroring `getInventoryMutableStateById`: relation-free `findUnique` returning `{ id, updatedAt, workOrderId, inventoryId, quantity, adjustmentType }`. CRITICAL TRAP: the existing normalizer emits `updatedAt` as an ISO STRING (read-repository.ts:120) and the OCC assert `assertAdjustmentExpectedUpdatedAtMatches` (update-adjustment.ts:61) compares `existing.updatedAt` (string) to `input.expectedUpdatedAt` (string), so the lean helper MUST return `updatedAt` via `.toISOString()`; and `quantity` MUST be a STRING (used by the `validateAdjustmentForm` merge at update-adjustment.ts:82) — or OCC/validation breaks.
- packages/db/src/inventory/adjustments/read-repository.ts:611 `getAdjustmentWithInventoryForMutation` (used by update:41 + delete:34; `adjustmentRowSelect` 4 rel + inventory + nested `inventory.unit` = 5-6 rel) — VULNERABLE. Grep confirms only update/delete-adjustment use it → delete it, OR de-relation it if kept for API stability.
- `getInventoryParentContextForAdjustments` (read-repository.ts:191, 1 rel) and `lockInventoryForAdjustment` live in packages/db/src/inventory/adjustments/ (YOURS) — the exact safe reads `create-adjustment` already uses. Confirm before reuse.

### Data — payments
- packages/db/src/payments/write-repository.ts:60 `createPaymentRecord` → `create` at :64 uses `include: paymentLinksInclude` at :81 (3 rel). Change to `select: { id: true }`, drop the include, narrow return to `Promise<{ id: string }>`.
- packages/db/src/payments/write-repository.ts:86 `updatePaymentRecord` → `update` at :107 uses `include: paymentLinksInclude` at :110 (3 rel). Change to `select: { id: true }`, narrow return to `Promise<{ id: string }>`. The P2025/P2003 mapping (update-payment.ts:47-66) MUST stay wrapping the lean update — the FK/not-found errors still throw from it.
- packages/db/src/payments/payment-links.ts:10 `paymentLinksInclude` — DO NOT CHANGE (shared with pooled reads).
- Pool-enrich read: reuse `getPaymentDetailById(id, { withNeighbors: false })` (read-repository.ts:150) or add `getPaymentByIdWithLinks(id)` — see Flag 1. NEVER `getPaymentById` (read-repository.ts:112, bare findUnique, no include).

### Application — adjustments
- packages/application/src/inventory/adjustments/create-adjustment.ts:40 — SAFE parts: `lockInventoryForAdjustment` :62, `getInventoryParentContextForAdjustments` :64 (1 rel). VULNERABLE: `insertAdjustmentRow` :106 (now lean `{id}`), `getAdjustmentById(inserted.id, c)` :158 (4 rel on tx → move to POOL after commit). Restructure like `create-inventory`: tx returns a lean carrier `{ adjustmentId, inventoryId, netDeducted }`; after commit `getAdjustmentById(adjustmentId)` on the POOL (no client); assemble `AdjustmentMutationResult`. The ceiling assert `assertNetDeductedWithinStartingStock` (:161) MUST stay INSIDE the tx (it rolls back on breach) — only the record enrich moves out.
- packages/application/src/inventory/adjustments/update-adjustment.ts:38 — `getAdjustmentWithInventoryForMutation` :41 → replace with the lean pair: `getAdjustmentMutableStateById(id)` then (after resolving `inventoryId`) `getInventoryParentContextForAdjustments(inventoryId)`, awaited SEQUENTIALLY on the tx. `updateAdjustmentRow` :130 now lean. `getAdjustmentById(existing.id, c)` :184 → POOL after commit. The metadata-only early-return path (:138-144, skips recompute) ALSO needs the pool enrich. `netDeducted` differs by path (metadata-only = `inventory.currentNetDeducted`; chain-touched = `result.netDeducted`) — carry the resolved `netDeducted` + `inventoryId` out of the tx, then do ONE pool enrich (Flag 4).
- packages/application/src/inventory/adjustments/delete-adjustment.ts:31 — `getAdjustmentWithInventoryForMutation` :34 → same lean-pair replacement as update. `lockInventoryForAdjustment` :73 SAFE. `deleteAdjustmentRow` :75 SAFE (no select). `recomputeAndPersistNetDeducted` :77 → serialize (fixed in the db layer). Returns `{ deletedId, inventoryId, netDeducted }` — NO record enrich needed.

### Application — payments
- packages/application/src/payments/create-payment.ts:15 — `createPaymentRecord(..., c)` :54 now lean `{id}`; after commit pool-enrich with links, return the enriched payment.
- packages/application/src/payments/update-payment.ts:16 — `updatePaymentRecord` :45 now lean; pool-enrich after commit. Keep the P2025/P2003 mapping (:47-66) wrapping the lean update.
- packages/application/src/payments/delete-payment.ts:10 — SAFE: `deletePaymentRecordById` :14 (delete, no include). Wrapping it in `withDatabaseTransaction` is harmless; leave.

### Nested-caller / route check (already grepped — re-verify)
All six use cases are called ONLY from routes, none pass the optional `client` — so the post-commit POOL enrich is SAFE:
- Adjustments: create apps/web/app/api/inventory/[id]/adjustments/route.ts:73; update apps/web/app/api/inventory/[id]/adjustments/[adjustmentId]/route.ts:85; delete same file :126.
- Payments: create apps/web/app/api/payments/route.ts:21; update apps/web/app/api/payments/[id]/route.ts:34; delete same file :57.
- Response building: create/update-adjustment routes pass `result` straight through `buildResponseBody` (needs the full record → enrich required + viable); create/update-payment wrap `{ payment: result }` (enrich-with-links required + viable); deletes return id/ok only.

### Tests
- packages/application/tests/** payments: create-payment.test.ts asserts `toBe(created)` (:58-64), update-payment.test.ts asserts `toBe(updated)` (:57-61). After the fix the use case returns the POOL enrich → mock the new links-projecting pool read and assert against THAT; add it to the `@builders/db` `vi.mock` (create-payment.test.ts:20-24, update-payment.test.ts:20-24).
- Adjustments: create-adjustment.test.ts — `insertAdjustmentRow` mock (:121) now lean `{id}`; `getAdjustmentByIdMock` (:161) is now the POOL read. update/delete-adjustment tests mock `getAdjustmentWithInventoryForMutation` (update:5/28; delete:5/25,38) → replace with `getAdjustmentMutableStateById` + `getInventoryParentContextForAdjustments` mocks + lean `updateAdjustmentRow`.
- Mirror how the sibling inventory create/update tests were updated (reference precedent above).

## Migration (if schema changes)
None — code-only change; no schema edit, no migration.

## Done means
- /check-gauntlet green (build + typecheck + lint + test)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
