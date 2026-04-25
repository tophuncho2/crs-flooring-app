# Data Layer Reconstruction Plan — sweep 2

## Context

Sweep 1 landed two changes that the data layer has not yet absorbed:

1. **Schema migration** (`20260425025955_sweep_1_imports_inventory_and_cut_log_enum`) added the `FlooringStagedRowStatus` enum, the `FlooringInventory.inventoryNumber` sequence-defaulted column, made `itemNumber` nullable on both `FlooringInventory` and `FlooringImportStagedInventoryRow`, and switched the staged-row → import-entry FK from CASCADE to RESTRICT.
2. **Domain reconstruction** added `status: FlooringStagedRowStatus` and `importNumber: number` to `StagedInventoryRow`, added `inventoryNumber: string` to `InventoryRow`, and introduced new domain primitives (`IMPORT_MATERIALIZE_TOPIC`, status-aware predicates, dropdown-label formatter).

The data layer currently has 4 visible tsc errors and 2 latent (`TS2740`) errors that surface as soon as the visible ones are fixed. The application layer above also calls into non-existent symbols (per audit Section 5.2) — most resolve themselves once the data layer surface is consistent with the new domain truth.

This sweep makes the data layer's wire-format match the domain's truth, adds the two new primitives the materialization flow needs (`markStagedRowsForImport`, `materializeStagedRowsToInventory`), and consolidates `getImportLinkState` so the delete-import use case can call one read instead of two.

**Important meta-note about Plan Mode:** the user asked the plan to be pasted to `docs/`. Plan Mode restricts edits to this single plan file. **The first execution step (after approval) is to copy this plan into `docs/sweep-2-data-layer-plan.md`** verbatim, then proceed.

## Scope guardrails (recap)

- Three modules: `imports/`, `imports/staged-inventory-rows/`, `inventory/`. **`inventory/cut-logs/` is invisible.**
- Data layer = repositories + normalizers + selects. No business rules; no multi-repository orchestration; no HTTP.
- `*Record` write naming preserved. Optional `client = db` on read + per-row writes; transaction-only on batch primitives.
- Cut-log enum mismatch at `cut-logs/write-repository.ts:149` is left alone. Cut-log behavior is a later sweep.

---

## 1. Imports module — `packages/db/src/flooring/imports/`

### 1.1 `shared.ts`

**No changes.** `importRowSelect` and `importDetailSelect` already select every field on `FlooringImportEntry` that survived the migration; the migration didn't touch this table. `_count.stagedInventoryRows` and `_count.inventories` continue to work because the relations are unchanged.

- **Risk:** none.
- **Verify:** `npm run build --workspace=packages/db` after later modules land — this file shouldn't move.

### 1.2 `read-repository.ts`

**Item 1.2a — `normalizeImportRow.importNumber` typing.**

- **What:** Confirm `importNumber: row.importNumber` returns a `number`. The current line is `importNumber: row.importNumber,` (line 28 — no `String(...)` coercion). The domain `ImportRow.importNumber` is `number` (per audit Section 1.7) — already matches.
- **Why:** The audit's Open Observation #5 flagged `imports/types.ts` types it `number` while `staged-inventory-rows/types.ts` typed it `string`. The staged side was fixed in sweep 1 (now `number`); imports side was already correct.
- **Risk:** none.
- **Verify:** spot-read `read-repository.ts:25–42` to confirm no stale `String(...)` slipped in.

**Item 1.2b — Add `getImportLinkState`.**

- **What:** New read function:
  ```typescript
  export type ImportLinkStateRecord = {
    stagedInventoryRowCount: number
    liveInventoryRowCount: number
  }

  export async function getImportLinkState(
    id: string,
    client: ImportsDbClient = db,
  ): Promise<ImportLinkStateRecord | null> {
    const row = await client.flooringImportEntry.findUnique({
      where: { id },
      select: { _count: { select: { stagedInventoryRows: true, inventories: true } } },
    })
    if (!row) return null
    return {
      stagedInventoryRowCount: row._count.stagedInventoryRows,
      liveInventoryRowCount: row._count.inventories,
    }
  }
  ```
- **Why:** `packages/application/src/flooring/imports/delete-import.ts:20` calls `getImportDeleteState(id, c)` (audit Section 5.2 — non-existent) and feeds the result to `isImportDeleteBlocked(state)` from the domain. The domain's `ImportLinkState` is `{ stagedInventoryRowCount, liveInventoryRowCount }` exactly. One Prisma round-trip is cheaper than two `count` calls; structurally clearer than asking the use case to fan out and recombine. Field names match the domain shape so the use case can pass directly into the predicate without remapping.
- **Risk:** Returning `null` when the import doesn't exist diverges from the existing `countXById` pattern that returns `0`. Preferred: `null` carries the "no such row" signal the use case needs (and matches the existing `getInventoryDeleteState` precedent at `inventory/read-repository.ts:200` which also returns `{...} | null`).
- **Verify:** after writing, grep that the existing `countStagedInventoryByImportId` and `countLiveInventoryByImportId` are still exported (they have other potential callers and shouldn't be deleted).

**Item 1.2c — Keep `countStagedInventoryByImportId` / `countLiveInventoryByImportId`.**

- **What:** No change.
- **Why:** Still potentially useful for non-delete read paths; cheap to retain.
- **Risk:** none.

### 1.3 `write-repository.ts`

**Item 1.3a — Verify `*Record` naming and re-read pattern.**

- **What:** Confirm `createImportRecord`, `updateImportRecord`, `updateImportPercent`, `deleteImportRecordById` are exported with the audit's documented signatures. Don't touch them.
- **Why:** Audit Section 4.10 shows the convention is intact. The application-layer breakage is on the *call sites* (using `createImport` instead of `createImportRecord`), not the data layer.
- **Risk:** none.
- **Verify:** `grep -n "^export" packages/db/src/flooring/imports/write-repository.ts` matches the audit Section 1.2 export list.

**Item 1.3b — Confirm `updateImportPercent` isolation.**

- **What:** No change. The function is already separate from `updateImportRecord` and takes only `{ percent: ... }`.
- **Why:** Audit's `IMPORT_WORKER_FIELDS` rule (`imports/editability.ts`) enforces this contract; the data layer mirrors it correctly.
- **Risk:** none.

### 1.4 `index.ts`

**Item 1.4a — Verify barrel.**

- **What:** No change. The existing `export * from "./read-repository.js"` will pick up `getImportLinkState` and `ImportLinkStateRecord` automatically.
- **Verify:** after build, `grep "getImportLinkState" packages/db/dist/flooring/imports/read-repository.d.ts` returns the export.

### 1.5 Discretionary: `getImportLinkState`

**Recommendation: add now (Item 1.2b).**

Rationale:
- The application layer's delete-import use case is broken on this exact symbol. Fixing it in sweep 3 will require *something* in `@builders/db` of this shape. Defining it now in the same logical sweep as the other read-shape consolidations keeps related work together.
- One Prisma query vs two; trivial implementation; matches the established `getInventoryDeleteState` precedent.
- Field names already match `ImportLinkState` so no remapping shim needed.

Alternative considered: leave it for sweep 3. Rejected because it would force sweep 3 to either (a) add a data-layer function while doing application work (cross-layer scope), or (b) do `Promise.all([countStagedInventoryByImportId, countLiveInventoryByImportId])` and remap field names. (a) violates layering hygiene; (b) is wasteful and ugly.

---

## 2. Staged inventory rows module — `packages/db/src/flooring/imports/staged-inventory-rows/`

### 2.1 `shared.ts`

**Item 2.1a — Add `status` to `stagedInventoryRowSelect`.**

- **What:** Insert `status: true,` next to `isImported: true,` in the select object (around line 49).
- **Why:** Domain `StagedInventoryRow.status` is required (sweep 1). `StagedInventoryRowPayload` is derived via `Prisma.FlooringImportStagedInventoryRowGetPayload<{ select: typeof stagedInventoryRowSelect }>`, so adding the select key is what makes `payload.status` available with the correct enum type.
- **Risk:** none — additive select.
- **Verify:** after change, `payload.status` is typed as `FlooringStagedRowStatus` in the normalizer.

### 2.2 `read-repository.ts`

**Item 2.2a — Drop `String(...)` coercion on `importNumber`.**

- **What:** Change line 43 from `importNumber: String(row.importEntry.importNumber),` to `importNumber: row.importEntry.importNumber,`.
- **Why:** Domain `StagedInventoryRow.importNumber` is now `number` (sweep 1). Prisma's `Int` column comes through as `number` directly. This resolves the visible tsc error at `read-repository.ts:43`.
- **Risk:** Any caller that did string concatenation on `importNumber` will silently get the same string output via JS coercion. No call sites in scope.
- **Verify:** tsc error at `:43` disappears.

**Item 2.2b — Coalesce `itemNumber` null to empty string.**

- **What:** Change line 54 from `itemNumber: row.itemNumber,` to `itemNumber: row.itemNumber ?? "",`.
- **Why:** Schema column is now nullable; domain row type still declares `string`. Audit Section 4.1 documents the established convention: empty-string-as-null in the denormalized read shape (e.g., `dyeLot: row.dyeLot ?? ""` on the very next line). Choosing this over option (b) — propagating `string | null` into the domain — matches the established convention and avoids cascading null-handling into UI consumers in this sweep.
- **Risk:** UI consumers can no longer distinguish "blank itemNumber" from "no itemNumber"; the established convention already accepts that tradeoff for `dyeLot`, `notes`, `locationId`, etc., so consistency wins.
- **Verify:** tsc error at `:54` disappears.

**Item 2.2c — Add `status: row.status` to the returned literal.**

- **What:** Insert `status: row.status,` in the normalizer's return object (logical placement: next to `isImported`, around line 67).
- **Why:** Domain `StagedInventoryRow.status` is required. This resolves the latent `TS2740` (currently masked by 2.2a/2.2b errors).
- **Risk:** none.
- **Verify:** rebuild and confirm no `TS2740` for `status` surfaces.

**Item 2.2d — `listStagedInventoryByImport` and `getStagedInventoryById` unchanged.**

- **What:** No signature or behavior change. Both call into `normalizeStagedInventoryRow`, which is now correct.
- **Why:** They propagate the fixed normalizer; nothing else needs touching.

### 2.3 `write-repository.ts`

**Item 2.3a — `CreateStagedInventoryRecordInput.itemNumber` becomes `string | null`.**

- **What:** Change `itemNumber: string` to `itemNumber: string | null` on the input type (line 18). Update the `data: { itemNumber: input.itemNumber }` line in `createStagedInventoryRecord` accordingly — Prisma already accepts `string | null` since the column is nullable.
- **Why:** Schema column is nullable; the create path should accept null. Same change to `UpdateStagedInventoryRecordInput.itemNumber` (already optional via `Partial`, but the underlying property type needs to permit `null`).
- **Risk:** Application-layer callers passing only `string` are still compatible (subtype). Application-layer code that narrows `string` after the call may need to widen — but per audit, the application layer for staged inventory has no use cases yet (no `apps/.../staged-inventory-rows/` either), so blast radius is zero in this sweep.
- **Verify:** type check.

**Item 2.3b — Confirm `applyStagedInventoryRowsDiff` is status-blind.**

- **What:** No change. Verified during planning research: `UpdateStagedInventoryRecordInput`, `buildUpdateData`, and `ApplyStagedInventoryRowsDiffInput` do not reference `status`. The user diff path edits `productId`, `itemNumber`, `dyeLot`, `warehouseId`, `locationId`, `startingStock`, `cost`, `freight`, `notes`, and the legacy `isImported` latch — never `status`.
- **Why:** Status is worker-managed; user UI never touches it. Leaving the diff applier alone preserves the existing optimistic-lock-and-bulk-apply contract.
- **Risk:** none.

**Item 2.3c — Verify per-row CRUD `*Record` naming.**

- **What:** No change. `createStagedInventoryRecord`, `updateStagedInventoryRecord`, `deleteStagedInventoryRecordById` already follow the convention.
- **Verify:** export list intact.

### 2.4 `index.ts`

**Item 2.4a — Verify barrel.**

- **What:** No change. `export * from "./shared.js"` / `read-repository.js` / `write-repository.js` will surface the new function.

### 2.5 NEW: `markStagedRowsForImport`

**Item 2.5a — Spec.**

```typescript
export type MarkStagedRowsForImportInput = {
  importEntryId: string
  stagedRowIds: string[]
}

export type MarkStagedRowsForImportResult = {
  markedRowIds: string[]
  skippedRowIds: string[]
}

export async function markStagedRowsForImport(
  tx: Prisma.TransactionClient,
  input: MarkStagedRowsForImportInput,
): Promise<MarkStagedRowsForImportResult>
```

- **Location:** `packages/db/src/flooring/imports/staged-inventory-rows/write-repository.ts`. Same file as `applyStagedInventoryRowsDiff` per the precedent for transaction-only batch primitives (audit Section 4.10 + research confirmation).
- **Implementation sequence (single transaction):**
  1. **Pre-read** the requested IDs to discover which were eligible *before* the write:
     ```typescript
     const eligibleBefore = await tx.flooringImportStagedInventoryRow.findMany({
       where: {
         id: { in: input.stagedRowIds },
         importEntryId: input.importEntryId,
         status: "DRAFT",
         isImported: false,
       },
       select: { id: true },
     })
     const eligibleIds = new Set(eligibleBefore.map((row) => row.id))
     ```
  2. **Conditional bulk update** with the same WHERE clause:
     ```typescript
     await tx.flooringImportStagedInventoryRow.updateMany({
       where: {
         id: { in: Array.from(eligibleIds) },
         importEntryId: input.importEntryId,
         status: "DRAFT",
         isImported: false,
       },
       data: { status: "QUEUED", isImported: true },
     })
     ```
  3. **Derive split:**
     ```typescript
     const markedRowIds = Array.from(eligibleIds)
     const skippedRowIds = input.stagedRowIds.filter((id) => !eligibleIds.has(id))
     return { markedRowIds, skippedRowIds }
     ```

- **Why transaction-only:** the read-then-write pair is only safe under serializable isolation (or an enclosing `SELECT … FOR UPDATE` from the use case). The application layer will lock the parent import row first. Defaulting `client = db` would invite callers to skip the lock and race.
- **Why pre-read instead of compare counts:** the prompt's "compare returned count vs requested IDs" approach can't tell *which* IDs were skipped — it only gives the count. The pre-read gives precise IDs at one extra round-trip cost; the application layer needs the precise list to surface per-row UI feedback for the unselected rows.
- **Risk:**
  - Subtle: a row could change state between the pre-read and the update if the lock isn't held. The use case's parent-import `FOR UPDATE` lock + transaction isolation contains this. Document the contract in the doc-comment.
  - The pre-read could miss IDs that are present in the table but bound to a different import (`importEntryId` mismatch). The skipped list will include them, which is correct — they're "skipped" from the use case's perspective.
- **Verify:** add a focused integration check during execution: insert two staged rows (one DRAFT, one QUEUED), call with both IDs, expect `markedRowIds: [draftId]` and `skippedRowIds: [queuedId]`. (Worth running once during execution; not a permanent test in this sweep.)

### 2.6 NEW: `materializeStagedRowsToInventory`

**Recommendation: add as a narrow data-layer batch primitive in `packages/db/src/flooring/inventory/write-repository.ts`** (NOT in staged-inventory-rows — the primary write target is `flooring_inventory`, with a secondary `updateMany` to flip staged status).

- **Spec:**
  ```typescript
  export type MaterializeStagedRowsToInventoryInput = {
    importEntryId: string
    inventoryRowsToCreate: Array<CreateInventoryRecordInput & { sourceStagedRowId: string }>
  }

  export type MaterializeStagedRowsToInventoryResult = {
    createdInventoryIds: string[]
    materializedStagedRowIds: string[]
  }

  export async function materializeStagedRowsToInventory(
    tx: Prisma.TransactionClient,
    input: MaterializeStagedRowsToInventoryInput,
  ): Promise<MaterializeStagedRowsToInventoryResult>
  ```

- **Implementation sequence (single transaction):**
  1. `tx.flooringInventory.createMany({ data: input.inventoryRowsToCreate.map(stripSourceStagedRowId), skipDuplicates: false })` — bulk insert. Returns `{ count }`.
  2. Re-read created rows by `importEntryId` + the relevant scope to collect the new `id`s. (Prisma's `createMany` doesn't return inserted IDs on Postgres pre-5.14 client; the safer pattern is to pre-assign UUIDs at the call site, mirroring the diff applier's pre-assigned-IDs approach. Plan: require the application layer to pre-assign `id` for each row, the data layer trusts it.)
  3. `tx.flooringImportStagedInventoryRow.updateMany({ where: { id: { in: input.inventoryRowsToCreate.map(r => r.sourceStagedRowId) }, status: "QUEUED" }, data: { status: "IMPORTED" } })` — flip the queued rows.
  4. Return both ID lists.

- **Why this split (data-layer bulk insert, application-layer field math):**
  - The audit's `applyStagedInventoryRowsDiff` is the precedent: a single-logical-write batch primitive that does delete + create + update + reload atomically. `materializeStagedRowsToInventory` follows the same shape (insert + status-flip in one transaction).
  - The application layer (sweep 3) owns the *math*: mapping staged-row fields to inventory-row fields, computing `costPerUnit = cost / startingStock`, deciding `coveragePerUnit` per category rules (delegating to `categorySupportsCoverageComputation`), stamping `fifoReceivedAt`. None of that is data-layer territory.
  - `inventoryNumber` is sequence-defaulted at the DB level — the data layer doesn't compute or pass it; Postgres assigns it. The re-read or pre-assigned-ID flow needs to pull `inventoryNumber` back to the caller; the application layer needs it for the outbox event payload (per `IMPORT_MATERIALIZE_TOPIC`).

- **Why transaction-only:** atomicity of insert + status-flip is the entire point. A partial application (inserts succeeded, status flip failed) leaves the system in an inconsistent state with no easy reconciliation. Required `tx` parameter.

- **Why this file, not staged's:** the primary write target is `flooring_inventory`. Co-locating with `createInventoryRecord` keeps the inventory-write surface in one place. The staged status-flip is a secondary concern of this operation.

- **Alternative considered:** delete `createInventoryRecord` and have `materializeStagedRowsToInventory` be the only inventory write entry point. **Rejected** — keeps the per-row primitive available for future tests, edge cases, and any direct-create flow that might emerge. Symmetric with the `applyStagedInventoryRowsDiff` precedent (which doesn't delete the per-row `create*Record` either).

- **Risk:**
  - Pre-assigned-ID requirement is an unconventional contract; document clearly in the doc-comment.
  - The application layer needs the new `inventoryNumber` values for outbox payload — solved by a final `findMany({ where: { id: { in: createdInventoryIds } }, select: { id: true, inventoryNumber: true } })` inside this primitive, returned as part of the result. Update spec accordingly:
    ```typescript
    export type MaterializeStagedRowsToInventoryResult = {
      created: Array<{ id: string; inventoryNumber: string }>
      materializedStagedRowIds: string[]
    }
    ```

- **Verify:** integration check during execution — pre-assign two UUIDs, call with valid `CreateInventoryRecordInput[]`, confirm two `flooring_inventory` rows exist with sequence-assigned `inventoryNumber`s and the corresponding staged rows flipped to `IMPORTED`.

---

## 3. Inventory module — `packages/db/src/flooring/inventory/`

### 3.1 `shared.ts`

**Item 3.1a — Add `inventoryNumber: true` to `inventoryRowSelect`.**

- **What:** Insert `inventoryNumber: true,` near the top of the `inventoryRowSelect` object (next to `id`).
- **Why:** Resolves the latent `TS2740` once `read-repository.ts:111` is fixed. Audit Section 3.7 + Open Observation #9 flagged this gap.
- **Risk:** none — additive select. Slightly larger payload over the wire; negligible.
- **Verify:** `payload.inventoryNumber` is typed `string` in the normalizer.

**Item 3.1b — `inventoryDetailSelect` inherits via spread.**

- **What:** No explicit change; `inventoryDetailSelect = { ...inventoryRowSelect, cutLogs: ... }` will pick it up.
- **Verify:** spot-check the spread.

**Item 3.1c — Confirm no `isImported` references.**

- **What:** No change. Verified during planning research: `isImported` is not referenced in `inventory/write-repository.ts` (and not in `shared.ts` either — the column is gone from `FlooringInventory`).
- **Verify:** `grep "isImported" packages/db/src/flooring/inventory/{shared,read-repository,write-repository}.ts` returns zero results.

### 3.2 `read-repository.ts`

**Item 3.2a — Add `inventoryNumber` to the returned literal.**

- **What:** Insert `inventoryNumber: payload.inventoryNumber,` near the top of `normalizeInventoryRow`'s return object (placement: directly after `id`, mirroring the domain field-order convention).
- **Why:** Resolves the latent `TS2740`.
- **Risk:** none.
- **Verify:** rebuild succeeds; the latent error never surfaces.

**Note on Prisma client typing:** the planning explore flagged `inventoryNumber: string | null` in the generated client. The schema declares `String` (non-nullable, with sequence default), which should produce `string`. If the agent misread or the client regen is out of date, the fix is to coalesce: `inventoryNumber: payload.inventoryNumber ?? ""`. Plan: write the non-null form first (`payload.inventoryNumber`), and if tsc complains, add the `?? ""` coalesce. Either form is correct; the schema dictates which.

**Item 3.2b — Coalesce `itemNumber` null.**

- **What:** Change line 111 from `itemNumber: payload.itemNumber,` to `itemNumber: payload.itemNumber ?? "",`. Same pattern as Item 2.2b.
- **Why:** Same convention; same rationale.
- **Risk:** same as 2.2b.
- **Verify:** tsc error at `:111` disappears.

**Item 3.2c — `normalizeInventoryDetail` propagates.**

- **What:** No change — it spreads `normalizeInventoryRow(payload)`.

**Item 3.2d — Confirm no `isImported` in normalizer output.**

- **What:** No change. Verified — the current return literal has no `isImported` field. (It was removed in a previous sweep before sweep 1, per the comment block at the top of the file.)

**Item 3.2e — `listInventoryOptions` unchanged.**

- **What:** No change.
- **Why:** Returns FK option lists, not inventory rows.

**Item 3.2f — Skip `getInventoryByIdWithLock`.**

- **What:** Do not add. Defer to the cut-log sweep.
- **Why:** Cut-log row-locking pattern is out of scope here; pre-emptive abstractions invite drift.

### 3.3 `write-repository.ts`

**Item 3.3a — `CreateInventoryRecordInput.itemNumber` becomes `string | null`.**

- **What:** Change `itemNumber: string` to `itemNumber: string | null` on `CreateInventoryRecordInput` (line 29). `buildCreateData` (line 80) passes `input.itemNumber` directly to Prisma — no further change needed; Prisma already accepts `null`.
- **Why:** Schema column is nullable; create input should reflect.
- **Risk:** none in scope.
- **Verify:** type check.

**Item 3.3b — `UpdateInventoryRecordInput` already supports nullable.**

- **What:** Confirm `itemNumber?: string` on the update input (line 50) — extend to `itemNumber?: string | null` so updates can clear the value. `buildUpdateData` already passes `input.itemNumber` through unconditionally when defined; matches.
- **Why:** Same reasoning.
- **Risk:** Application/UI callers might rely on "string only" — but the application layer is being rebuilt in sweep 3 and modules are out of scope; safe.

**Item 3.3c — `updateInventoryTotalCutSum` stays.**

- **What:** No change. Cut-log territory uses it.

**Item 3.3d — `deleteInventoryRecordById` stays.**

- **What:** No change.

### 3.4 Discretionary: `createInventoryRecord` disposition

**Recommendation: keep `createInventoryRecord` as the worker-facing per-row primitive.** Add `materializeStagedRowsToInventory` (Item 2.6) as the bulk-flow primitive *alongside* it, not replacing it.

Rationale:
- Symmetric with the diff-applier precedent: `applyStagedInventoryRowsDiff` was added without removing the per-row `createStagedInventoryRecord`. The bulk primitive is the *common path*; the per-row primitive is the escape hatch.
- The audit (Section 7 / planning research) confirmed there is no current worker call site for inventory creation. The bulk primitive will be the worker's *primary* path, but keeping the per-row create costs nothing and preserves flexibility for tests, future single-row materialization (e.g., one-off corrections), or any direct-create flow that might emerge.
- The current `createInventoryRecord` input shape is correct after Item 3.3a.

Alternative considered: delete `createInventoryRecord`. **Rejected** because removing a primitive that has zero current callers is no win — it just means the next person who needs it has to re-derive its (already-correct) input shape.

---

## 4. Cross-cutting

### 4.1 Barrel exports — additions surfaced through `@builders/db`

Per planning research, the barrel chain is:
```
packages/db/src/index.ts
  → packages/db/src/flooring/imports/index.ts
    → packages/db/src/flooring/imports/staged-inventory-rows/index.ts
  → packages/db/src/flooring/inventory/index.ts
```

All intermediate barrels use `export *`, so new symbols propagate automatically. **No barrel files need explicit edits.**

New symbols that will appear in `@builders/db` after this sweep:
- `getImportLinkState` (function)
- `ImportLinkStateRecord` (type)
- `markStagedRowsForImport` (function)
- `MarkStagedRowsForImportInput`, `MarkStagedRowsForImportResult` (types)
- `materializeStagedRowsToInventory` (function)
- `MaterializeStagedRowsToInventoryInput`, `MaterializeStagedRowsToInventoryResult` (types)

### 4.2 Decimal handling

No changes. New code follows the established convention: `Prisma.Decimal | string | number | null` on writes, `string` (via `toInventoryFixedString` or pass-through) on reads. No `decimal.js` introduction. The new primitives (`materializeStagedRowsToInventory`) inherit `CreateInventoryRecordInput`'s decimal field types verbatim.

### 4.3 Latent error verification approach

After Items 2.2c (status) and 3.2a (inventoryNumber) land:
- Run `cd packages/db && npx tsc -p tsconfig.json --noEmit` and confirm output is **only** the cut-log baseline error at `cut-logs/write-repository.ts:149`.
- Specifically: lines 43, 54, 111 from the previous sweep's report should all clear.
- The 2 latent `TS2740`s flagged in the previous sweep should not surface (because the missing fields are now set in the literals).

---

## 5. Open questions for human review

1. **`inventoryNumber` Prisma client typing.** The planning explore reported `inventoryNumber: string | null` in the generated client at `node_modules/.prisma/client/index.d.ts:17940`, but the schema declares `String` (not `String?`). One of those is wrong:
   - If the schema is correct → execution proceeds with `payload.inventoryNumber` (no coalesce).
   - If the client is correct (someone made it nullable) → use `payload.inventoryNumber ?? ""`.
   - **Resolution path during execution:** check the actual Prisma client `.d.ts` line during step 3.1a; the schema is the source of truth. If they disagree, regenerate the client (`npx prisma generate`) and recheck. If they still disagree, halt and flag.

2. **`materializeStagedRowsToInventory` pre-assigned ID contract.** This requires the application layer (sweep 3) to assign UUIDs before calling the primitive. That's a constraint on the next sweep's design. Confirm this is acceptable, or specify an alternative (e.g., pure DB-side ID assignment with per-row re-read to recover IDs — slower, but no caller contract).

3. **`updateMany` skipped-IDs precision.** The proposed `markStagedRowsForImport` uses a pre-read to get exact skipped IDs. This costs one extra round-trip vs the count-only approach. If round-trips matter more than precision (e.g., the use case can tolerate "N rows skipped, see logs"), I can drop the pre-read. Default plan: keep the pre-read for precise UI feedback.

4. **`itemNumber` null handling pattern (Items 2.2b, 3.2b).** Recommendation is empty-string-as-null per established convention. Alternative: propagate `string | null` into the domain row type. The latter is a domain-sweep concern, not a data-sweep concern; flagging in case the user wants the data sweep to pre-stage that change.

5. **Plan-mode constraint vs user instruction.** The user asked for the plan in `docs/`. Plan mode locks me to the designated plan file. Execution step 0 (after approval) copies this plan into `docs/sweep-2-data-layer-plan.md` verbatim before proceeding with item 1.1.

---

## 6. Execution order

Sequenced to surface failures at the earliest point and keep tsc honest at each checkpoint.

**Step 0** (post-approval, pre-implementation):
- Copy this plan to `docs/sweep-2-data-layer-plan.md` per user request.

**Phase A — Imports module (low risk, lays groundwork):**
1. Item 1.2b — add `getImportLinkState` + `ImportLinkStateRecord`.
2. Build + verify exports surface.

**Phase B — Inventory module (resolves 2 baseline + 1 latent error):**
3. Item 3.1a — add `inventoryNumber: true` to `inventoryRowSelect`.
4. Item 3.2a — add `inventoryNumber: payload.inventoryNumber` to normalizer return.
5. Item 3.2b — coalesce `itemNumber` to empty string.
6. Item 3.3a — `CreateInventoryRecordInput.itemNumber: string | null`.
7. Item 3.3b — `UpdateInventoryRecordInput.itemNumber: string | null`.
8. **Checkpoint:** `cd packages/db && npx tsc -p tsconfig.json --noEmit`. Expect: no errors in `inventory/read-repository.ts` or `inventory/write-repository.ts`. Cut-log error at `:149` remains.

**Phase C — Staged module (resolves 2 baseline + 1 latent error):**
9. Item 2.1a — add `status: true` to `stagedInventoryRowSelect`.
10. Item 2.2a — drop `String(...)` on `importNumber`.
11. Item 2.2b — coalesce `itemNumber` to empty string.
12. Item 2.2c — add `status: row.status` to normalizer return.
13. Item 2.3a — `CreateStagedInventoryRecordInput.itemNumber: string | null`.
14. **Checkpoint:** `cd packages/db && npx tsc -p tsconfig.json --noEmit`. Expect: no errors in `staged-inventory-rows/`. Cut-log error at `:149` is the only remaining.

**Phase D — New batch primitives:**
15. Item 2.5 — implement `markStagedRowsForImport` in `staged-inventory-rows/write-repository.ts`.
16. Item 2.6 — implement `materializeStagedRowsToInventory` in `inventory/write-repository.ts`.
17. **Checkpoint:** `cd packages/db && npx tsc -p tsconfig.json --noEmit` clean (cut-log baseline only). `npm run build --workspace=packages/db` succeeds. `npx prisma validate` passes.

**Phase E — Whole-monorepo verification:**
18. `npx tsc -b` from repo root. Expect: cut-log `:149` error remains; all data-layer entries from prior sweep's report are gone; application-layer errors from audit Section 5.2 remain (sweep 3's job — but several should be eliminated by the data layer now exporting `*Record` names + `getImportLinkState` correctly).
19. Diff the new error set against the baseline + previous-sweep delta. Document any unexpected new errors (none expected).

**Step Final:**
20. Write a sweep-2 report to `docs/sweep-2-data-layer-report.md` mirroring the sweep-1 report's structure (per-file delta, new exports, deletions, build result, tsc diff, deviations, remaining work for sweep 3).

## Critical files

- `packages/db/src/flooring/imports/read-repository.ts` (add `getImportLinkState`)
- `packages/db/src/flooring/imports/staged-inventory-rows/shared.ts` (add `status` to select)
- `packages/db/src/flooring/imports/staged-inventory-rows/read-repository.ts` (3 normalizer fixes)
- `packages/db/src/flooring/imports/staged-inventory-rows/write-repository.ts` (input type widen + new `markStagedRowsForImport`)
- `packages/db/src/flooring/inventory/shared.ts` (add `inventoryNumber` to select)
- `packages/db/src/flooring/inventory/read-repository.ts` (2 normalizer fixes)
- `packages/db/src/flooring/inventory/write-repository.ts` (input type widen + new `materializeStagedRowsToInventory`)

## Reused existing functions / utilities

- Prisma's `GetPayload<{ select: typeof X }>` pattern — already established in `shared.ts` files; new `status` and `inventoryNumber` selects propagate types automatically.
- `withDatabaseTransaction` from `@builders/db` (`packages/db/src/client.ts:43`) — application layer wraps the new batch primitives; not called from the data layer itself.
- `applyStagedInventoryRowsDiff` precedent (`packages/db/src/flooring/imports/staged-inventory-rows/write-repository.ts:160`) — template for transaction-only batch primitive shape, doc-comment style, and required-`tx` signature.
- Domain `ImportLinkState` (`packages/domain/src/flooring/imports/delete-rules.ts:5–8`) — `getImportLinkState` returns this exact shape (under the `Record`-suffixed alias).
- `categorySupportsCoverageComputation` (sweep 1, `packages/domain/src/flooring/inventory/editability.ts`) — used by the *application layer* in sweep 3 when mapping staged → inventory; data layer does not call it.

## Verification (end-to-end)

After full execution:
1. `cd packages/db && npx prisma validate` → passes.
2. `cd packages/db && npx tsc -p tsconfig.json --noEmit` → only `cut-logs/write-repository.ts:149` remains.
3. `npm run build --workspace=packages/db` → succeeds.
4. `npx tsc -b` from repo root → application-layer + apps/web errors remain per audit Section 5.2 (sweep 3 / 4 territory). No new errors caused by this sweep beyond the cut-log baseline.
5. Spot-check: `node -e "import('@builders/db').then(m => console.log(typeof m.getImportLinkState, typeof m.markStagedRowsForImport, typeof m.materializeStagedRowsToInventory))"` from repo root after build → all three log `function`.
