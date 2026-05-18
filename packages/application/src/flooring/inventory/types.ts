import type { InventoryRecord } from "@builders/db"

export type UpdateInventoryInput = {
  rollNumber?: string
  dyeLot?: string
  location?: string
  note?: string
  internalNotes?: string
  isArchived?: boolean
}

export type InventoryResult = InventoryRecord
