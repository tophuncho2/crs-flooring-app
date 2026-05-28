import type { FlooringInventoryAdjustmentStatus, InventoryAdjustmentRow } from "./types.js"

export function isAdjustmentPendingEditable(
  row: Pick<InventoryAdjustmentRow, "status" | "isFinal">,
): boolean {
  return row.status === "PENDING" && !row.isFinal
}

export function isAdjustmentQueued(row: Pick<InventoryAdjustmentRow, "status">): boolean {
  return row.status === "QUEUED"
}

export function isAdjustmentFinalized(row: Pick<InventoryAdjustmentRow, "isFinal">): boolean {
  return row.isFinal === true
}

export function canDeleteAdjustment(
  row: Pick<InventoryAdjustmentRow, "status" | "isFinal">,
): boolean {
  return isAdjustmentPendingEditable(row)
}

export function canRelinkAdjustment(
  row: Pick<InventoryAdjustmentRow, "status" | "adjustmentType">,
): boolean {
  if (row.adjustmentType === "INCREASE") return false
  if (row.status === "QUEUED") return false
  return true
}

export function buildAdjustmentNotPendingMessage(
  row: Pick<InventoryAdjustmentRow, "status" | "isFinal">,
): string {
  if (row.isFinal)
    return "Inventory adjustment has been finalized and is no longer editable as a draft."
  if (row.status === "QUEUED")
    return "Inventory adjustment has a worker job in flight; try again once it settles."
  return "Inventory adjustment is editable."
}

export type AdjustmentFinalizabilityReason =
  | "NOT_PENDING_STATUS"
  | "ALREADY_QUEUED"
  | "ALREADY_FINAL"
  | "ZERO_OR_NEGATIVE_QUANTITY"

export function getAdjustmentFinalizabilityBlocker(
  row: Pick<InventoryAdjustmentRow, "status" | "isFinal" | "quantity">,
): AdjustmentFinalizabilityReason | null {
  if (row.status === "QUEUED") return "ALREADY_QUEUED"
  if (row.isFinal) return "ALREADY_FINAL"
  if (row.status !== "PENDING") return "NOT_PENDING_STATUS"
  const parsed = Number((row.quantity ?? "").toString())
  if (!Number.isFinite(parsed) || parsed <= 0) return "ZERO_OR_NEGATIVE_QUANTITY"
  return null
}

export function canFinalizeAdjustment(
  row: Pick<InventoryAdjustmentRow, "status" | "isFinal" | "quantity">,
): boolean {
  return getAdjustmentFinalizabilityBlocker(row) === null
}

export type { FlooringInventoryAdjustmentStatus }
