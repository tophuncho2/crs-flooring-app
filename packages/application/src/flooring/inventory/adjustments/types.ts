import type { InventoryAdjustmentRecord } from "@builders/db"
import type { FlooringInventoryAdjustmentType } from "@builders/domain"

export type AdjustmentMutationScope =
  | { kind: "work-order"; workOrderId: string }
  | { kind: "inventory"; inventoryId: string }

/**
 * Discriminated union over the two create flows:
 *  - `variant: "cut"` — a WO-linked DEDUCTION. The route under
 *    `/api/work-orders/[id]/adjustments` produces this shape; the use case
 *    enforces the WOMI scope and stamps `adjustmentType: "DEDUCTION"` +
 *    WO-link columns onto the row.
 *  - `variant: "manual"` — a free-form INCREASE or DEDUCTION created from the
 *    inventory hub. May OPTIONALLY carry a WO link (both `workOrderId` +
 *    `workOrderItemId` set, or both absent) — an INCREASE may now link a work
 *    order. `isWaste` is a caller-supplied reporting flag, allowed on either
 *    direction.
 *
 * `warehouseId` (both variants, optional) is the warehouse selected in the
 * form as an inventory filter. When present it is asserted to equal the chosen
 * inventory's warehouse (the persisted warehouse is always the inventory's).
 */
export type CreatePendingAdjustmentInput =
  | {
      variant: "cut"
      workOrderId: string
      workOrderItemId: string
      inventoryId: string
      warehouseId?: string | null
      quantity: string
      isWaste: boolean
      notes: string
    }
  | {
      variant: "manual"
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
