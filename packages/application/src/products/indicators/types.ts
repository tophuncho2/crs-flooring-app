import type { InventoryIndicatorRecord } from "@builders/db"

export type IndicatorMutationResult = InventoryIndicatorRecord

export type CreateIndicatorInput = {
  productId: string
  warehouseId: string
  unitId: string
  lowStockThreshold: string
  internalNotes: string
  isActive: boolean
}

export type UpdateIndicatorInput = {
  /** Parent-product scope — the record-view route addresses indicators under a product. */
  productId: string
  indicatorId: string
  expectedUpdatedAt: string
  patch: {
    lowStockThreshold?: string
    internalNotes?: string
    isActive?: boolean
  }
}

export type DeleteIndicatorInput = {
  productId: string
  indicatorId: string
  expectedUpdatedAt: string
}
