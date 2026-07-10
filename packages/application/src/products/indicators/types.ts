import type { InventoryIndicatorRecord } from "@builders/db"
import type { InventoryIndicatorsSectionDiff } from "@builders/domain"

export type IndicatorMutationResult = InventoryIndicatorRecord

export type CreateIndicatorInput = {
  productId: string
  warehouseId: string
  unitId: string
  lowStockThreshold: string
  internalNotes: string
  isActive: boolean
}

/** The Indicators-section diff-save payload — one product's edits + deletes. */
export type SaveIndicatorsSectionInput = {
  productId: string
  diff: InventoryIndicatorsSectionDiff
}

/** The product's fresh indicator rows after the diff is applied. */
export type SaveIndicatorsSectionResult = {
  rows: InventoryIndicatorRecord[]
}
