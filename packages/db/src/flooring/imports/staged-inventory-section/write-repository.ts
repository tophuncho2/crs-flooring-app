import type { Prisma } from "../../../generated/prisma/client.js"
import {
  listFilterRowsByImport,
  type StagedInventoryFilterRecord,
} from "../staged-inventory-filter-rows/read-repository.js"
import {
  emptyToNullStockOrdered,
  type WriteStagedInventoryFilterRecordInput,
} from "../staged-inventory-filter-rows/write-repository.js"
import {
  listStagedInventoryByImport,
  type StagedInventoryRecord,
} from "../staged-inventory-rows/read-repository.js"
import type {
  CreateStagedInventoryRecordInput,
  UpdateStagedInventoryRecordInput,
} from "../staged-inventory-rows/write-repository.js"

/**
 * Combined diff-save primitive for the imports record-view's
 * "staged inventory" section. Replaces the filter-rows-only
 * `applyStagedInventoryFiltersDiff` — the section now saves both
 * filter rows AND staged inventory rows atomically.
 *
 * Caller contract (application layer):
 *  - Opens the transaction via `withDatabaseTransaction` and locks the
 *    parent import row FOR UPDATE before invoking.
 *  - Pre-validated both slices via the domain validators
 *    (`validateStagedInventoryFiltersDiff`, `validateStagedInventoryRowsDiff`)
 *    and the per-row form validators.
 *  - Pre-assigned UUIDs to added entries on both slices via
 *    `assignDraftIds`.
 *  - Resolved every staged-row added entry's parent filter row to its
 *    POST-DIFF productId + stockUnit snapshot, and stamped the
 *    `warehouseId` from the parent import. The unsaved-parent rule
 *    means `filterRowId` is always a real id (existing or just-deleted
 *    is impossible — the domain validator rejects).
 *
 * Execution order:
 *  1. Delete staged rows in `rows.deleted` (must precede filter deletes
 *     because of the FK RESTRICT on `filterRowId`).
 *  2. Delete filter rows in `filters.deleted`.
 *  3. Build `filterTempIdMap` from `filters.added`; `createMany` filters.
 *  4. Per-row update each `filters.modified`.
 *  5. Build `rowTempIdMap` from `rows.added`; `createMany` staged rows
 *     (snapshots already resolved by the application layer).
 *  6. Per-row update each `rows.modified` — only the 7 user-editable
 *     fields are honored by the existing update-data builder.
 *  7. Reload post-state for both slices.
 *  8. Return both lists + both tempId maps.
 */
export type ApplyImportStagedInventorySectionDiffInput = {
  importEntryId: string
  filters: {
    added: Array<{
      id: string
      tempId: string
      input: WriteStagedInventoryFilterRecordInput
    }>
    modified: Array<{ id: string; input: WriteStagedInventoryFilterRecordInput }>
    deleted: Array<{ id: string }>
  }
  rows: {
    added: Array<{
      id: string
      tempId: string
      input: Omit<CreateStagedInventoryRecordInput, "importEntryId">
    }>
    modified: Array<{ id: string; input: UpdateStagedInventoryRecordInput }>
    deleted: Array<{ id: string }>
  }
}

export type ApplyImportStagedInventorySectionDiffResult = {
  filterRows: StagedInventoryFilterRecord[]
  stagedRows: StagedInventoryRecord[]
  filterTempIdMap: Record<string, string>
  rowTempIdMap: Record<string, string>
}

function buildFilterUpdateData(
  input: WriteStagedInventoryFilterRecordInput,
): Prisma.FlooringImportStagedInventoryFilterRowUpdateInput {
  return {
    categoryFilter: input.categoryFilterId
      ? { connect: { id: input.categoryFilterId } }
      : { disconnect: true },
    product: { connect: { id: input.productId } },
    stockOrdered: emptyToNullStockOrdered(input.stockOrdered),
    stockUnitName: input.stockUnitName,
    stockUnitAbbrev: input.stockUnitAbbrev,
  }
}

function buildStagedRowUpdateData(
  input: UpdateStagedInventoryRecordInput,
): Prisma.FlooringImportStagedInventoryRowUpdateInput {
  const data: Prisma.FlooringImportStagedInventoryRowUpdateInput = {}
  if (input.rollNumber !== undefined) data.rollNumber = input.rollNumber
  if (input.dyeLot !== undefined) data.dyeLot = input.dyeLot
  if (input.location !== undefined) data.location = input.location
  if (input.startingStock !== undefined) data.startingStock = input.startingStock
  if (input.cost !== undefined) data.cost = input.cost
  if (input.freight !== undefined) data.freight = input.freight
  if (input.note !== undefined) data.note = input.note
  return data
}

export async function applyImportStagedInventorySectionDiff(
  tx: Prisma.TransactionClient,
  input: ApplyImportStagedInventorySectionDiffInput,
): Promise<ApplyImportStagedInventorySectionDiffResult> {
  // Step 1 — delete staged rows first (FK RESTRICT from staged rows →
  // filter rows means filter deletes would fail otherwise).
  if (input.rows.deleted.length > 0) {
    await tx.flooringImportStagedInventoryRow.deleteMany({
      where: { id: { in: input.rows.deleted.map((d) => d.id) } },
    })
  }

  // Step 2 — delete filter rows.
  if (input.filters.deleted.length > 0) {
    await tx.flooringImportStagedInventoryFilterRow.deleteMany({
      where: { id: { in: input.filters.deleted.map((d) => d.id) } },
    })
  }

  // Step 3 — create filter rows with pre-assigned ids; build tempId map.
  const filterTempIdMap: Record<string, string> = {}
  for (const draft of input.filters.added) {
    filterTempIdMap[draft.tempId] = draft.id
  }
  if (input.filters.added.length > 0) {
    await tx.flooringImportStagedInventoryFilterRow.createMany({
      data: input.filters.added.map((draft) => ({
        id: draft.id,
        importEntryId: input.importEntryId,
        categoryFilterId: draft.input.categoryFilterId,
        productId: draft.input.productId,
        stockOrdered: emptyToNullStockOrdered(draft.input.stockOrdered),
        stockUnitName: draft.input.stockUnitName,
        stockUnitAbbrev: draft.input.stockUnitAbbrev,
      })),
    })
  }

  // Step 4 — per-row update filters.
  for (const update of input.filters.modified) {
    await tx.flooringImportStagedInventoryFilterRow.update({
      where: { id: update.id },
      data: buildFilterUpdateData(update.input),
    })
  }

  // Step 5 — create staged rows with pre-assigned ids; build tempId map.
  // Snapshots (productId, stockUnit*, warehouseId, filterRowId) are
  // already resolved by the application layer.
  const rowTempIdMap: Record<string, string> = {}
  for (const draft of input.rows.added) {
    rowTempIdMap[draft.tempId] = draft.id
  }
  if (input.rows.added.length > 0) {
    await tx.flooringImportStagedInventoryRow.createMany({
      data: input.rows.added.map((draft) => ({
        id: draft.id,
        importEntryId: input.importEntryId,
        filterRowId: draft.input.filterRowId,
        productId: draft.input.productId,
        warehouseId: draft.input.warehouseId,
        stockUnitName: draft.input.stockUnitName,
        stockUnitAbbrev: draft.input.stockUnitAbbrev,
        rollNumber: draft.input.rollNumber,
        dyeLot: draft.input.dyeLot,
        location: draft.input.location,
        startingStock: draft.input.startingStock,
        cost: draft.input.cost,
        freight: draft.input.freight,
        note: draft.input.note,
      })),
    })
  }

  // Step 6 — per-row update staged rows (7 user-editable fields only).
  for (const update of input.rows.modified) {
    const data = buildStagedRowUpdateData(update.input)
    if (Object.keys(data).length === 0) continue
    await tx.flooringImportStagedInventoryRow.update({
      where: { id: update.id },
      data,
    })
  }

  // Step 7 — reload both slices.
  const [filterRows, stagedRows] = await Promise.all([
    listFilterRowsByImport(input.importEntryId, tx),
    listStagedInventoryByImport(input.importEntryId, tx),
  ])

  return { filterRows, stagedRows, filterTempIdMap, rowTempIdMap }
}
