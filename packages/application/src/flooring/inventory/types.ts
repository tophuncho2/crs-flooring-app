import type { InventoryRecord } from "@builders/db"

export type UpdateInventoryInput = {
  rollNumber?: string
  dyeLot?: string
  location?: string
  note?: string
  internalNotes?: string
  isArchived?: boolean
}

export type CreateInventoryInput = {
  productId: string
  warehouseId: string
  rollNumber: string
  dyeLot: string
  note: string
  startingStock: string
  location: string
  internalNotes: string
}

/**
 * Merge N existing inventory rows of one product into a single new row. The
 * merged row's `startingStock` is NOT in the input — it is computed
 * server-authoritative under lock as the total remaining balance of the
 * sources (adjustments do not carry over). `warehouseId` is operator-chosen
 * (the sources may span warehouses); `productId` is the single product every
 * source must share (the cardinal cross-product invariant). The remaining
 * fields are the standard editable inventory cells for the new row.
 */
export type MergeInventoryInput = {
  productId: string
  warehouseId: string
  sourceInventoryIds: string[]
  rollNumber: string
  dyeLot: string
  note: string
  location: string
  internalNotes: string
}

export type InventoryResult = InventoryRecord
