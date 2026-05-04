# Cut-log inventory snapshot — execution summary

Plan: [sessions/2026-05-03-cut-log-inventory-snapshot-plan.md](sessions/2026-05-03-cut-log-inventory-snapshot-plan.md)
Schema migration: [20260503162452_add_cut_log_inventory_snapshot/migration.sql](packages/db/prisma/migrations/20260503162452_add_cut_log_inventory_snapshot/migration.sql) — already applied to staging.
Branch: `staging`

## TL;DR

`FlooringCutLog` rows now carry an immutable identity snapshot
(`inventoryNumber` + nullable `itemNumber` + nullable `dyeLot` +
`categorySlug`) stamped from the parent inventory at create time. The
single live create path (`createPendingCutLogUseCase` → `insertPendingCutLogRow`)
sources the snapshot from the same inventory row it already locks `FOR UPDATE`
and reads — no new query, no new lock. Two unreachable write primitives
(`createCutLogRecord` and `applyCutLogPendingSaveDiff`) were deleted as
part of the same commit per `CLAUDE.md`'s "delete completely if certain
unused" rule.

Module render changes — using the new columns directly to retire the
per-WOMI `listEligibleInventoryRequest` fetch — are the **next** bundle,
not this one.

## What changed

| Phase | File | Change |
|---|---|---|
| **A — drop dead code** | [packages/db/src/flooring/inventory/cut-logs/write-repository.ts](packages/db/src/flooring/inventory/cut-logs/write-repository.ts) | Deleted `createCutLogRecord` + `CreateCutLogRecordInput` (~32 lines). Deleted `applyCutLogPendingSaveDiff` + `ApplyCutLogPendingSaveDiffInput` + `ApplyCutLogPendingSaveDiffResult` (~85 lines). Removed unused `listCutLogsByInventoryId` import. `buildPendingUpdateData` retained — still called by `updateCutLogPending`. |
| **B — domain types + helper** | [packages/domain/src/flooring/inventory/cut-logs/types.ts](packages/domain/src/flooring/inventory/cut-logs/types.ts) | `CutLogRow` gains `inventoryNumber: string`, `itemNumber: string \| null`, `dyeLot: string \| null`, `categorySlug: string`. |
| | [packages/domain/src/flooring/inventory/cut-logs/diff/types.ts](packages/domain/src/flooring/inventory/cut-logs/diff/types.ts) | `CutLogParentContext` gains `inventoryNumber`, `itemNumber`, `dyeLot` so readers can surface them to the create use case. |
| | [packages/domain/src/flooring/inventory/cut-logs/pending-cut-log-inventory-snapshot.ts](packages/domain/src/flooring/inventory/cut-logs/pending-cut-log-inventory-snapshot.ts) | **New.** `PendingCutLogInventorySnapshot` type + `buildPendingCutLogInventorySnapshot(inv)` projection helper. Mirrors the existing `PendingCutLogUnitSnapshot` pattern. JSDoc explicitly notes `notes` is **not** in the snapshot. |
| | [packages/domain/src/flooring/inventory/cut-logs/index.ts](packages/domain/src/flooring/inventory/cut-logs/index.ts) | Re-export. |
| **C — data layer** | [packages/db/src/flooring/inventory/cut-logs/shared.ts](packages/db/src/flooring/inventory/cut-logs/shared.ts) | `cutLogRowSelect` adds 4 fields. |
| | [packages/db/src/flooring/inventory/cut-logs/read-repository.ts](packages/db/src/flooring/inventory/cut-logs/read-repository.ts) | `normalizeCutLogRow` passes through the 4 new fields. `getInventoryParentContextForCutLogs` widens its select + return shape with the 3 identity fields. |
| | [packages/db/src/flooring/work-orders/cut-logs/read-repository.ts](packages/db/src/flooring/work-orders/cut-logs/read-repository.ts) | `getPendingCutLogWithInventoryForMutation` (used by update + delete use cases) widens its inventory select + the `CutLogParentContext` mapping with the 3 identity fields. |
| | [packages/db/src/flooring/work-orders/cut-logs/write-repository.ts](packages/db/src/flooring/work-orders/cut-logs/write-repository.ts) | `InsertPendingCutLogRowInput` gains `inventorySnapshot: PendingCutLogInventorySnapshot`. The `create` body stamps `inventoryNumber`, `itemNumber`, `dyeLot`, `categorySlug` alongside the existing unit-snapshot fields. JSDoc updated. |
| **D — application** | [packages/application/src/flooring/work-orders/cut-logs/create-pending-cut-log.ts](packages/application/src/flooring/work-orders/cut-logs/create-pending-cut-log.ts) | Use case calls `buildPendingCutLogInventorySnapshot` with the inventory row it already reads, passes it as `inventorySnapshot` to `insertPendingCutLogRow`. No new query, no new lock — same row, same TX. Step-7 comment updated to mention both snapshots. |

Finalize and void use cases: **untouched** (snapshot frozen at create per the plan).

## Verification

- `npm run typecheck` (full monorepo: domain, lib, db, pdf, application, web, relay, worker) → **passes**.
- Build chain rebuilt: `@builders/domain` and `@builders/db` regenerated; Prisma client regenerated.
- Manual smoke test pending (user-side): create a cut log via the existing UI flow, then:
  ```sql
  select id, "inventoryId", "inventoryNumber", "itemNumber", "dyeLot", "categorySlug"
  from flooring_cut_log
  order by "createdAt" desc limit 1;
  ```
  Expect the 4 columns to match the parent inventory row.

## Divergences from plan

1. **`getPendingCutLogWithInventoryForMutation` widened too.** Plan only called out `getInventoryParentContextForCutLogs`, but the type extension to `CutLogParentContext` forced this second reader (used by update + delete use cases) to also include the 3 identity fields. Trivial — same shape change, three more lines of select + three more lines of mapping. The data is essentially free given the inventory row is already being joined.
2. **Removed `listCutLogsByInventoryId` import** from the inventory write-repo — became unused once `applyCutLogPendingSaveDiff` was deleted. Caught by the linter / typecheck pass and cleaned.

## Out of scope (next bundle)

Module render side. The cut-log subgrid cell at [work-order-cut-log-row.tsx:83](apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx:83) still uses a per-WOMI `listEligibleInventoryRequest` fetch + `inventoryLabels` map to build its label. Once we point it at `cutLog.inventoryNumber/itemNumber/dyeLot` directly, that fetch and map go away — and rows whose parent inventory is now archived/depleted will render correctly (today they fall back to the raw UUID). The side panel `inventoryDisplay` IIFE in [cut-log-edit-form-fields.tsx:40](apps/web/modules/work-orders/components/record/material-items/cut-log-edit-panel/cut-log-edit-form-fields.tsx:40) gets the same treatment. `notes` is dropped from the rendered package on this path (matches user's framing — no live join, no snapshot).

## Commit message (this bundle, separate from the schema commit)

```
cut-logs: stamp inventory identity snapshot on create

The cut log row now carries inventoryNumber + itemNumber + dyeLot +
categorySlug as immutable snapshots from the parent inventory at create
time, mirroring the existing unit-snapshot pattern. createPendingCutLog
sources the snapshot from the same inventory row it already locks FOR
UPDATE — no new query. Finalize and void do not re-stamp.

Two unreachable write primitives (createCutLogRecord and
applyCutLogPendingSaveDiff in the inventory cut-logs write-repo) had
zero external callers and would have needed the new fields wired
through; deleted them per CLAUDE.md "if you are certain something is
unused, you can delete it completely".

Module render changes ship in a follow-up commit: the subgrid Inventory
cell + side-panel display will read from cutLog.inventoryNumber/...
directly, retiring the per-WOMI eligible-inventory fetch the cell
currently uses as a label-resolution lookup.
```
