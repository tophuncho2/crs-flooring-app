import type { InventoryAdjustmentRecord } from "@builders/db"
import type { FlooringInventoryAdjustmentType } from "@builders/domain"

export type AdjustmentMutationScope =
  | { kind: "work-order"; workOrderId: string }
  | { kind: "inventory"; inventoryId: string }

/**
 * Single create flow. All adjustments are created through the inventory route
 * (`/api/inventory/[id]/adjustments`); the form knows the chosen inventory once
 * an inventory is picked. An adjustment may OPTIONALLY carry a WO link (both
 * `workOrderId` + `workOrderItemId` set, or both absent — an INCREASE may link
 * a work order). `warehouseId` (optional) is the warehouse selected in the form
 * as an inventory filter; when present it is asserted to equal the chosen
 * inventory's warehouse (the persisted warehouse is always the inventory's).
 * `isWaste` is a reporting flag allowed on either direction.
 */
export type CreatePendingAdjustmentInput = {
  adjustmentType: FlooringInventoryAdjustmentType
  inventoryId: string
  warehouseId?: string | null
  workOrderId?: string | null
  workOrderItemId?: string | null
  quantity: string
  isWaste: boolean
  notes: string
}

export type UpdatePendingAdjustmentPatch = {
  /** Always positive (validator enforces); direction is immutable post-create. */
  quantity?: string
  /** Reporting flag; editable on either direction. */
  isWaste?: boolean
  notes?: string
  /** WO link, editable on either direction (both ids set, or both null). */
  link?: { workOrderId: string | null; workOrderItemId: string | null }
}

export type UpdatePendingAdjustmentInput = {
  scope: AdjustmentMutationScope
  adjustmentId: string
  expectedUpdatedAt: string
  patch: UpdatePendingAdjustmentPatch
}

export type DeletePendingAdjustmentInput = {
  scope: AdjustmentMutationScope
  adjustmentId: string
  expectedUpdatedAt: string
}

export type FinalizeAdjustmentInput = {
  scope: AdjustmentMutationScope
  adjustmentId: string
}

export type AdjustmentMutationResult = {
  adjustment: InventoryAdjustmentRecord
  inventoryId: string
  netDeducted: string
}

export type DeleteAdjustmentResult = {
  deletedId: string
  inventoryId: string
  netDeducted: string
}

export type FinalizeAdjustmentResult = {
  adjustment: InventoryAdjustmentRecord
}
