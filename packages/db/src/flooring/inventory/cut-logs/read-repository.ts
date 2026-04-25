import { type CutLogRow, type CutLogStatus } from "@builders/domain"
import { db } from "../../../client.js"
import {
  cutLogRowSelect,
  type CutLogDbClient,
  type CutLogRowPayload,
} from "./shared.js"

export type CutLogRecord = CutLogRow

function toDecimalString(value: { toString(): string } | null | undefined): string {
  if (value === null || value === undefined) return ""
  return value.toString()
}

/**
 * Normalize a cut-log payload into the domain read shape. The `coverageCut`
 * column is now stored on the row directly (as of the cut-log/work-order-item
 * schema sweep), so the normalizer reads it as a scalar — no per-row math.
 */
export function normalizeCutLogRow(row: CutLogRowPayload): CutLogRecord {
  const status: CutLogStatus = row.status
  return {
    id: row.id,
    inventoryId: row.inventoryId,
    workOrderId: row.workOrderId ?? null,
    workOrderItemId: row.workOrderItemId ?? null,
    before: row.before.toString(),
    cut: row.cut.toString(),
    after: row.after.toString(),
    coverageCut: toDecimalString(row.coverageCut),
    status,
    isWaste: row.isWaste,
    void: row.void,
    cost: toDecimalString(row.cost),
    freight: toDecimalString(row.freight),
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function getCutLogById(
  id: string,
  client: CutLogDbClient = db,
): Promise<CutLogRecord | null> {
  const row = await client.flooringCutLog.findUnique({
    where: { id },
    select: cutLogRowSelect,
  })
  return row ? normalizeCutLogRow(row) : null
}

export async function listCutLogsByInventoryId(
  inventoryId: string,
  client: CutLogDbClient = db,
): Promise<CutLogRecord[]> {
  const rows = await client.flooringCutLog.findMany({
    where: { inventoryId },
    select: cutLogRowSelect,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
  return rows.map(normalizeCutLogRow)
}
