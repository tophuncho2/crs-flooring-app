import type { Prisma } from "../../generated/prisma/client.js"
import { db } from "../../client.js"
import { type StagedInventoryFilterDbClient } from "./shared.js"
import {
  getFilterRowById,
  type StagedInventoryFilterRecord,
} from "./read-repository.js"

/**
 * Wire-input shape for filter-row writes. Combines the user-supplied form fields
 * with the `unitId` the application layer resolves (seeded from FlooringProduct,
 * re-seeded on product-change, else the user's edit). Mirrors WOMI's
 * `WriteWorkOrderMaterialItemCreateInput` — same orchestration shape.
 */
export type WriteStagedInventoryFilterRecordInput = {
  productId: string
  unitId: string | null
  stockOrdered: Prisma.Decimal | string | number | null
  // Conversion trio — seeded from the product, re-seeded on product-change.
  coverageUnitId: string | null
  coveragePerUnit: Prisma.Decimal | string | number | null
  conversionFormulaId: string | null
}

/**
 * Stock ordered is optional. A blank string (or null/whitespace) is
 * persisted as NULL — the column is nullable. Shared by both the per-row
 * and section write repositories so the empty→null rule lives in one place.
 */
export function emptyToNullStockOrdered(
  value: Prisma.Decimal | string | number | null,
): Prisma.Decimal | string | number | null {
  if (value === null || String(value).trim() === "") return null
  return value
}

export async function createStagedInventoryFilterRecord(
  importEntryId: string,
  input: WriteStagedInventoryFilterRecordInput,
  client: StagedInventoryFilterDbClient = db,
): Promise<StagedInventoryFilterRecord> {
  const row = await client.flooringImportStagedInventoryFilterRow.create({
    data: {
      importEntry: { connect: { id: importEntryId } },
      product: { connect: { id: input.productId } },
      ...(input.unitId ? { unit: { connect: { id: input.unitId } } } : {}),
      ...(input.coverageUnitId
        ? { coverageUnit: { connect: { id: input.coverageUnitId } } }
        : {}),
      coveragePerUnit: input.coveragePerUnit,
      ...(input.conversionFormulaId
        ? { conversionFormula: { connect: { id: input.conversionFormulaId } } }
        : {}),
      stockOrdered: emptyToNullStockOrdered(input.stockOrdered),
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
    product: { connect: { id: input.productId } },
    unit:
      input.unitId && input.unitId.trim() !== ""
        ? { connect: { id: input.unitId } }
        : { disconnect: true },
    coverageUnit:
      input.coverageUnitId && input.coverageUnitId.trim() !== ""
        ? { connect: { id: input.coverageUnitId } }
        : { disconnect: true },
    coveragePerUnit: input.coveragePerUnit,
    conversionFormula:
      input.conversionFormulaId && input.conversionFormulaId.trim() !== ""
        ? { connect: { id: input.conversionFormulaId } }
        : { disconnect: true },
    stockOrdered: emptyToNullStockOrdered(input.stockOrdered),
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

