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
  cost: string
  freight: string
  location: string
  internalNotes: string
}

export type InventoryResult = InventoryRecord
