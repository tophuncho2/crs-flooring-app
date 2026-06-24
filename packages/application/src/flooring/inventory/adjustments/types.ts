import type { InventoryAdjustmentRecord } from "@builders/db"
import type { FlooringInventoryAdjustmentType, PaletteColor } from "@builders/domain"

export type AdjustmentMutationScope =
  | { kind: "work-order"; workOrderId: string }
  | { kind: "inventory"; inventoryId: string }

/**
 * Single create flow. All adjustments are created through the inventory route
 * (`/api/inventory/[id]/adjustments`); the form knows the chosen inventory once
 * an inventory is picked. An adjustment may OPTIONALLY carry a `workOrderId`
 * link — any product, any direction; it never links to a material item.
 * `warehouseId` (optional) is the warehouse selected in the form as an inventory
 * filter; when present it is asserted to equal the chosen inventory's warehouse
 * (the persisted warehouse is always the inventory's). `isWaste` is a reporting
 * flag allowed on either direction.
 */
export type CreatePendingAdjustmentInput = {
  adjustmentType: FlooringInventoryAdjustmentType
  inventoryId: string
  warehouseId?: string | null
  workOrderId?: string | null
  quantity: string
  isWaste: boolean
  notes: string
  /** Non-semantic palette tag; omitted → DB default SLATE. */
  color?: PaletteColor
  /** User-owned free-text location. Not seeded from the parent inventory. */
  location?: string | null
}

export type UpdatePendingAdjustmentPatch = {
  /**
   * Always positive (validator enforces); direction lives in `adjustmentType`.
   * Freely editable for the row's whole lifecycle — editing it re-flows the
   * inventory's before/after chain.
   */
  quantity?: string
  /**
   * Direction (INCREASE | DEDUCTION). Freely editable for the row's whole
   * lifecycle — flipping it re-flows the inventory's netDeducted + before/after
   * chain and is re-checked against the starting-stock ceiling.
   */
  adjustmentType?: FlooringInventoryAdjustmentType
  /**
   * Metadata trio — also freely editable. `isWaste` is a reporting flag on
   * either direction; `location` is user-owned free text (never re-snapped
   * from parent).
   */
  isWaste?: boolean
  notes?: string
  location?: string | null
  /** Non-semantic palette tag. Metadata only — never triggers a ledger recompute. */
  color?: PaletteColor
  /** WO link, editable on either direction (any product). `null` unlinks. */
  link?: { workOrderId: string | null }
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
