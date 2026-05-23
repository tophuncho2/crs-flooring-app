import type { Prisma } from "../../../generated/prisma/client.js"
import { db } from "../../../client.js"
import { type StagedInventoryFilterDbClient } from "./shared.js"
import {
  getFilterRowById,
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

