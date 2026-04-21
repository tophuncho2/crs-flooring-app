import type { InventoryRecord } from "@builders/db"

export type CreateInventoryInput = {
  productId: string
  warehouseId: string
  locationId: string
  itemNumber: string
  dyeLot: string
  stockCount: string
  cost: string
  freight: string
  notes: string
}

export type UpdateInventoryInput = Partial<CreateInventoryInput> & {
  isImported?: boolean
}

export type InventoryResult = InventoryRecord
