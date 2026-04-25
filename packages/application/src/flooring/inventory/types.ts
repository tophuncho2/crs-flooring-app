import type { InventoryRecord } from "@builders/db"

export type UpdateInventoryInput = {
  itemNumber?: string
  dyeLot?: string
  warehouseId?: string
  locationId?: string
  notes?: string
  isArchived?: boolean
}

export type InventoryResult = InventoryRecord
