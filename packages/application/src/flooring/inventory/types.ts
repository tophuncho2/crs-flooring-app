import type { InventoryRecord } from "@builders/db"

export type UpdateInventoryInput = {
  rollNumber?: string
  dyeLot?: string
  location?: string
  note?: string
  internalNotes?: string
  isArchived?: boolean
}

/**
 * Input for the duplicate-inventory use case — the five user-editable fields.
 * `rollNumber` / `note` / `startingStock` arrive pre-filled from the source
 * row (then edited); `location` / `internalNotes` start blank. Everything else
 * on the new row is pasted from the source, server-set, or DB-generated.
 */
export type DuplicateInventoryInput = {
  rollNumber: string
  note: string
  startingStock: string
  location: string
  internalNotes: string
}

export type InventoryResult = InventoryRecord
