import type { Prisma } from "../../../generated/prisma/client.js"
import { db } from "../../../client.js"
import { type StagedInventoryFilterDbClient } from "./shared.js"
import {
  getFilterRowById,
  listFilterRowsByImport,
  type StagedInventoryFilterRecord,
} from "./read-repository.js"

/**
 * Wire-input shape for filter-row writes. Combines the user-supplied
 * form fields with the stock-unit snapshot the application layer
 * computes from FlooringProduct before invoking. Mirrors WOMI's
 * `WriteWorkOrderMaterialItemCreateInput` — same orchestration shape.
 */
export type WriteStagedInventoryFilterRecordInput = {
  categoryFilterId: string | null
  productId: string
  stockOrdered: Prisma.Decimal | string | number
  stockUnitName: string | null
  stockUnitAbbrev: string | null
}

export async function createStagedInventoryFilterRecord(
  importEntryId: string,
  input: WriteStagedInventoryFilterRecordInput,
  client: StagedInventoryFilterDbClient = db,
): Promise<StagedInventoryFilterRecord> {
  const row = await client.flooringImportStagedInventoryFilterRow.create({
    data: {
      importEntry: { connect: { id: importEntryId } },
      categoryFilter: input.categoryFilterId
        ? { connect: { id: input.categoryFilterId } }
        : undefined,
      product: { connect: { id: input.productId } },
      stockOrdered: input.stockOrdered,
      stockUnitName: input.stockUnitName,
      stockUnitAbbrev: input.stockUnitAbbrev,
    },
    select: { id: true },
  })
  const record = await getFilterRowById(row.id, client)
  if (!record) {
    throw new Error(
      "createStagedInventoryFilterRecord: record disappeared mid-transaction",
    )
  }
  return record
}

function buildUpdateData(
  input: WriteStagedInventoryFilterRecordInput,
): Prisma.FlooringImportStagedInventoryFilterRowUpdateInput {
  return {
    categoryFilter: input.categoryFilterId
      ? { connect: { id: input.categoryFilterId } }
      : { disconnect: true },
    product: { connect: { id: input.productId } },
    stockOrdered: input.stockOrdered,
    stockUnitName: input.stockUnitName,
    stockUnitAbbrev: input.stockUnitAbbrev,
  }
}

export async function updateStagedInventoryFilterRecord(
  id: string,
  input: WriteStagedInventoryFilterRecordInput,
  client: StagedInventoryFilterDbClient = db,
): Promise<StagedInventoryFilterRecord> {
  await client.flooringImportStagedInventoryFilterRow.update({
    where: { id },
    data: buildUpdateData(input),
    select: { id: true },
  })
  const record = await getFilterRowById(id, client)
  if (!record) {
    throw new Error(
      `updateStagedInventoryFilterRecord: row ${id} not found after update`,
    )
  }
  return record
}

/**
 * Standalone delete. The FK from FlooringImportStagedInventoryRow →
 * FlooringImportStagedInventoryFilterRow is RESTRICT, so this throws
 * if any staged inv rows still reference the filter row. The domain
 * diff validator catches that case ahead of time with
 * `FILTER_DELETE_BLOCKED_BY_CHILDREN`; the FK is the last-line
 * backstop.
 */
export async function deleteStagedInventoryFilterRecordById(
  id: string,
  client: StagedInventoryFilterDbClient = db,
): Promise<void> {
  await client.flooringImportStagedInventoryFilterRow.delete({ where: { id } })
}

// --- Diff-save primitive ---

/**
 * Diff-save primitive for the imports record-view's filter-rows section.
 *
 * Caller contract (application layer):
 *  - Opens the transaction via `withDatabaseTransaction` and locks the
 *    parent import row FOR UPDATE before invoking.
 *  - Validated the diff via `validateStagedInventoryFiltersDiff` (domain)
 *    — duplicate-product, locked-with-children, delete-blocked-by-children,
 *    unknown-product.
 *  - Pre-assigned UUIDs to added drafts via
 *    `assignStagedInventoryFilterDiffIds`.
 *  - Resolved each draft / update to a `WriteStagedInventoryFilterRecordInput`
 *    (form + stock-unit snapshot stamped from FlooringProduct).
 *
 * Execution order — mirrors WOMI's `applyWorkOrderMaterialItemsDiff`:
 *  1. deleteMany(deleted.ids) — children-blocked deletes are caught by
 *     the FK RESTRICT at the very latest.
 *  2. Build tempIdMap from added (pure, no round-trip).
 *  3. createMany(added) using pre-assigned ids.
 *  4. Per-row update for each modified entry.
 *  5. Reload post-state via listFilterRowsByImport(importEntryId, tx).
 *  6. Return { rows, tempIdMap }.
 */
export type ApplyStagedInventoryFiltersDiffInput = {
  importEntryId: string
  added: Array<{
    id: string
    tempId: string
    input: WriteStagedInventoryFilterRecordInput
  }>
  modified: Array<{ id: string; input: WriteStagedInventoryFilterRecordInput }>
  deleted: Array<{ id: string }>
}

export type ApplyStagedInventoryFiltersDiffResult = {
  rows: StagedInventoryFilterRecord[]
  tempIdMap: Record<string, string>
}

export async function applyStagedInventoryFiltersDiff(
  tx: Prisma.TransactionClient,
  input: ApplyStagedInventoryFiltersDiffInput,
): Promise<ApplyStagedInventoryFiltersDiffResult> {
  // Step 1 — batch delete
  if (input.deleted.length > 0) {
    await tx.flooringImportStagedInventoryFilterRow.deleteMany({
      where: { id: { in: input.deleted.map((d) => d.id) } },
    })
  }

  // Step 2 — tempIdMap from added (pure)
  const tempIdMap: Record<string, string> = {}
  for (const draft of input.added) {
    tempIdMap[draft.tempId] = draft.id
  }

  // Step 3 — batch create with pre-assigned ids
  if (input.added.length > 0) {
    await tx.flooringImportStagedInventoryFilterRow.createMany({
      data: input.added.map((draft) => ({
        id: draft.id,
        importEntryId: input.importEntryId,
        categoryFilterId: draft.input.categoryFilterId,
        productId: draft.input.productId,
        stockOrdered: draft.input.stockOrdered,
        stockUnitName: draft.input.stockUnitName,
        stockUnitAbbrev: draft.input.stockUnitAbbrev,
      })),
    })
  }

  // Step 4 — per-row updates
  for (const update of input.modified) {
    await tx.flooringImportStagedInventoryFilterRow.update({
      where: { id: update.id },
      data: buildUpdateData(update.input),
    })
  }

  // Step 5 — reload post-state
  const rows = await listFilterRowsByImport(input.importEntryId, tx)

  return { rows, tempIdMap }
}
