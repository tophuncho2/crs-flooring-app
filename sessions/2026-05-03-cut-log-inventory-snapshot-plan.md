# Cut-log inventory snapshot — domain + data + create use case

## Context

Schema already shipped (its own commit): `FlooringCutLog` has 4 new columns —
`inventoryNumber String NOT NULL`, `itemNumber String?`, `dyeLot String?`,
`categorySlug String NOT NULL`. The cut log table was emptied beforehand so
the migration applied without a backfill. Migration applied to staging in
[20260503162452_add_cut_log_inventory_snapshot/migration.sql](packages/db/prisma/migrations/20260503162452_add_cut_log_inventory_snapshot/migration.sql),
exit 0.

Now: domain + data + the single live create use case. After this bundle,
every newly-created cut log carries an immutable identity snapshot from
its parent inventory row at create time. Module / UI render changes (using
those snapshot fields directly to retire the per-WOMI eligible-inventory
fetch) ship in the **next** bundle — explicitly out of scope here.

Confirmed at planning time:
- `createCutLogRecord` and `applyCutLogPendingSaveDiff` in
  [packages/db/src/flooring/inventory/cut-logs/write-repository.ts](packages/db/src/flooring/inventory/cut-logs/write-repository.ts)
  have zero external callers (legacy from before commit `78bd6a03`).
- Only live create path: `insertPendingCutLogRow` (work-orders write repo)
  ← `createPendingCutLog.ts:120` (application use case).
- Finalize and void do **not** re-stamp the snapshot (frozen at create).
- The `notes` field of inventory is **not** snapshotted onto the cut log;
  it stays mutable on inventory and is rendered live via the dropdown
  during create-mode picking only.

## Phases

### A — Drop dead write primitives

**File:** [packages/db/src/flooring/inventory/cut-logs/write-repository.ts](packages/db/src/flooring/inventory/cut-logs/write-repository.ts)

- Delete `createCutLogRecord` (function + `CreateCutLogRecordInput` type).
- Delete `applyCutLogPendingSaveDiff` (function + the three input types it
  references: `ApplyCutLogPendingSaveDiffInput`, `…Result`, the
  add/modified/deleted helper types if they are unused after this drop).
- Delete `buildPendingUpdateData` if it has no remaining caller after the
  drop (it currently feeds both the deleted diff function and the still-live
  update primitive — verify before removing).
- Delete any imports that become unused (`getMaxFinalCutSequenceForInventory`
  etc.).

**Verification:** typecheck after each deletion ladder. Per `CLAUDE.md`'s
"avoid backwards-compat hacks; delete completely if certain unused" rule.

### B — Domain types + helper

**Files:**
- [packages/domain/src/flooring/inventory/cut-logs/types.ts](packages/domain/src/flooring/inventory/cut-logs/types.ts)
  (or wherever `CutLogRow` is defined — locate via grep)
- [packages/domain/src/flooring/inventory/cut-logs/](packages/domain/src/flooring/inventory/cut-logs/) (new helper file)

Add 4 fields to `CutLogRow`:

```ts
inventoryNumber: string
itemNumber: string | null
dyeLot: string | null
categorySlug: string
```

If a Zod schema for the cut log payload exists alongside (e.g. for API
response validation), add the same 4 fields with matching nullability.

Add a new helper, mirroring the existing `PendingCutLogUnitSnapshot`
pattern:

```ts
// new file: pending-cut-log-inventory-snapshot.ts
export type PendingCutLogInventorySnapshot = {
  inventoryNumber: string
  itemNumber: string | null
  dyeLot: string | null
  categorySlug: string
}

export function buildPendingCutLogInventorySnapshot(
  inv: PendingCutLogInventorySnapshot,
): PendingCutLogInventorySnapshot {
  return {
    inventoryNumber: inv.inventoryNumber,
    itemNumber: inv.itemNumber,
    dyeLot: inv.dyeLot,
    categorySlug: inv.categorySlug,
  }
}
```

Re-export from the cut-logs index. The function body is intentionally a
projection — its purpose is to give the call site a single named seam, the
same way `buildPendingCutLogUnitSnapshot` already does for unit fields.

### C — Data layer (read select + write input)

**Files:**
- [packages/db/src/flooring/inventory/cut-logs/shared.ts](packages/db/src/flooring/inventory/cut-logs/shared.ts) — `cutLogRowSelect` + `normalizeCutLogRow`
- [packages/db/src/flooring/work-orders/cut-logs/write-repository.ts](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts) — `insertPendingCutLogRow`

In `cutLogRowSelect`: add `inventoryNumber: true, itemNumber: true, dyeLot: true, categorySlug: true`.

In `normalizeCutLogRow`: pass the 4 new fields through (they're plain
strings/nullable strings — no decimal coercion).

In `insertPendingCutLogRow`'s input type, add a sibling field next to the
existing `unitSnapshot`:

```ts
export type InsertPendingCutLogRowInput = {
  // ...existing fields...
  unitSnapshot: PendingCutLogUnitSnapshot
  inventorySnapshot: PendingCutLogInventorySnapshot   // new
}
```

In the function body, stamp the 4 columns from `inventorySnapshot` in the
same `data: { … }` block where `unitSnapshot` fields are stamped. Update
the JSDoc to mention the new snapshot.

### D — Application: create-pending-cut-log use case

**File:** [packages/application/src/flooring/work-orders/cut-logs/create-pending-cut-log.ts](packages/application/src/flooring/work-orders/cut-logs/create-pending-cut-log.ts)

The use case already locks the parent inventory `FOR UPDATE` and reads its
unit fields (to build `unitSnapshot`). Extend that read to include
`inventoryNumber`, `itemNumber`, `dyeLot`, `categorySlug`, then build
`inventorySnapshot` via the new helper and pass it to
`insertPendingCutLogRow`. No new query, no new lock — same row, wider
select.

If the inventory read is currently in a `getInventoryForCutLogCreate(...)`
helper or similar, update that helper's select shape. Otherwise update
inline.

Finalize and void use cases: **no change** (snapshot is frozen at create).

### E — Verification

1. `npm run typecheck` (full monorepo) — must pass.
2. Create a cut log via the existing UI flow.
3. Inspect the row in Postgres:
   ```sql
   select id, inventoryId, inventoryNumber, itemNumber, dyeLot, categorySlug
   from flooring_cut_log
   order by createdAt desc limit 1;
   ```
   Confirm the 4 new columns match the parent inventory row.
4. Confirm the 4 fields are visible in the API response payload of the
   create endpoint (e.g. via browser devtools network tab).

## Out of scope (next bundle)

- **Module render changes.** The `formatInventoryRefPackage` call in
  [work-order-cut-log-row.tsx](apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx)
  and [cut-log-edit-form-fields.tsx](apps/web/modules/work-orders/components/record/material-items/cut-log-edit-panel/cut-log-edit-form-fields.tsx)
  currently sources its inputs from a per-material-item
  `listEligibleInventoryRequest` fetch. Once the cut log row carries
  `inventoryNumber/itemNumber/dyeLot` directly, the cell + side panel can
  read from the cut log and the per-WOMI fetch goes away. Drop `notes`
  from the rendered package on this path (matches user's framing).
- **Worker import paths.** Per memory, imports / staged inventory rebuild
  is in flight (sweep 4c next). The worker creates inventory; cut logs
  are not worker-created today. If that ever changes, the worker create
  path stamps the snapshot the same way.

## Critical files

- `packages/db/src/flooring/inventory/cut-logs/write-repository.ts` — drop dead primitives
- `packages/db/src/flooring/inventory/cut-logs/shared.ts` — `cutLogRowSelect` + normalizer
- `packages/db/src/flooring/work-orders/cut-logs/write-repository.ts` — `insertPendingCutLogRow`
- `packages/domain/src/flooring/inventory/cut-logs/types.ts` (and Zod sibling, if any) — `CutLogRow`
- `packages/domain/src/flooring/inventory/cut-logs/pending-cut-log-inventory-snapshot.ts` (new)
- `packages/application/src/flooring/work-orders/cut-logs/create-pending-cut-log.ts` — use-case body

## Open questions

None. User confirmed: `inventoryNumber + categorySlug` NOT NULL, `itemNumber + dyeLot` nullable, no backfill, no re-stamping on finalize/void, `notes` not snapshotted.

## Schema commit message (for the migration commit, separate from this bundle)

```
schema: add inventory snapshot columns to flooring_cut_log

Stamps inventoryNumber (NOT NULL), itemNumber, dyeLot, categorySlug from
the parent FlooringInventory row. Snapshot is frozen at create — finalize
and void do not re-stamp. Powers a future commit that retires the
per-WOMI eligible-inventory fetch the cut-log subgrid currently uses to
render labels.

Cut log table emptied beforehand; no backfill. Migration applied to
staging at 20260503162452.
```
