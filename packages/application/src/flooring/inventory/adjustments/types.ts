import type { InventoryAdjustmentRecord } from "@builders/db"
import type { FlooringInventoryAdjustmentType } from "@builders/domain"

export type AdjustmentMutationScope =
  | { kind: "work-order"; workOrderId: string }
  | { kind: "inventory"; inventoryId: string }

/**
 * Discriminated union over the two create flows:
 *  - `variant: "cut"` — a WO-linked DEDUCTION. The route under
 *    `/api/work-orders/[id]/cut-logs` produces this shape; the use case
 *    enforces the WOMI scope and stamps `adjustmentType: "DEDUCTION"` +
 *    WO-link columns onto the row.
 *  - `variant: "manual"` — a free-form INCREASE or DEDUCTION with no WO
 *    link, created from the inventory hub. `isWaste` is implicitly `false`
 *    (the row carries no waste semantics outside cuts).
 */
export type CreatePendingAdjustmentInput =
  | {
      variant: "cut"
      workOrderId: string
      workOrderItemId: string
      inventoryId: string
      quantity: string
      isWaste: boolean
      notes: string
    }
  | {
      variant: "manual"
      adjustmentType: FlooringInventoryAdjustmentType
      inventoryId: string
      quantity: string
      notes: string
    }

export type UpdatePendingAdjustmentPatch = {
  /** Always positive (validator enforces); direction is immutable post-create. */
  quantity?: string
  /** Editable only on DEDUCTION rows; rejected on INCREASE. */
  isWaste?: boolean
  notes?: string
  /** Editable only on DEDUCTION rows; rejected on INCREASE. */
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
