import type { InventoryRecord } from "@builders/db"

export type UpdateInventoryInput = {
  rollNumber?: string
  dyeLot?: string
  location?: string
  note?: string
  internalNotes?: string
  isArchived?: boolean
}

export type DuplicateInventoryInput = {
  rollNumber: string
  note: string
  startingStock: string
  location: string
  internalNotes: string
}

export type InventoryResult = InventoryRecord
