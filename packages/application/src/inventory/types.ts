import type { InventoryRecord } from "@builders/db"
import type { PaletteColor } from "@builders/domain"

export type UpdateInventoryInput = {
  location?: string
  internalNotes?: string
  isArchived?: boolean
  /** Non-semantic palette tag. Metadata only — never triggers a recompute. */
  color?: PaletteColor
  // Conversion trio — editable post-create (unlike the immutable unitId).
  coverageUnitId?: string
  coveragePerUnit?: string
  conversionFormulaId?: string
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
  // Conversion trio — seeded from the product on the form, editable.
  coverageUnitId: string
  coveragePerUnit: string
  conversionFormulaId: string
}

export type InventoryResult = InventoryRecord
