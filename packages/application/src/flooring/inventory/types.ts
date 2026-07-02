import type { InventoryRecord } from "@builders/db"
import type { PaletteColor } from "@builders/domain"

export type UpdateInventoryInput = {
  location?: string
  internalNotes?: string
  isArchived?: boolean
  /** Non-semantic palette tag. Metadata only — never triggers a recompute. */
  color?: PaletteColor
}

export type CreateInventoryInput = {
  productId: string
  // Unit FK (UoM epic 2B) — seeded from the product on the form, overridable.
  unitId: string
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
