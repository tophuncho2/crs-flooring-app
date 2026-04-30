import type { FlooringCutLogStatus } from "../../inventory/cut-logs/types.js"
import type { WorkOrderItemPendingCutLogRow } from "./types.js"

type WorkOrderItemPendingCutLogRowInput = {
  id: string
  cutLogNumber: string
  status: FlooringCutLogStatus
  isFinal: boolean
  inventoryId: string
  before: { toString(): string }
  cut: { toString(): string }
  after: { toString(): string }
  coverageCut: { toString(): string } | null
  isWaste: boolean
  notes: string | null
  finalCutSequence: number | null
  updatedAt: Date | string
}

export function normalizeWorkOrderItemPendingCutLogRow(
  row: WorkOrderItemPendingCutLogRowInput,
): WorkOrderItemPendingCutLogRow {
  return {
    id: row.id,
    cutLogNumber: row.cutLogNumber,
    status: row.status,
    isFinal: row.isFinal,
    inventoryId: row.inventoryId,
    before: row.before.toString(),
    cut: row.cut.toString(),
    after: row.after.toString(),
    coverageCut: row.coverageCut === null ? "" : row.coverageCut.toString(),
    isWaste: row.isWaste,
    notes: row.notes ?? "",
    finalCutSequence: row.finalCutSequence,
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
  }
}
