import type { InventoryAdjustmentRecord, InventoryRecord } from "@builders/db"
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

/**
 * A "return": one new inventory row (startingStock "0", cost/freight null) plus
 * one INCREASE adjustment (quantity = `returnedQuantity`) on it, in one tx. The
 * validated string fields mirror `CreateReturnEdits`; the trailing optionals are
 * adjustment-side extras. `location` feeds BOTH the new row and the adjustment.
 * There is no internalNotes / cost / freight / startingStock field on this form.
 */
export type CreateReturnInput = {
  productId: string
  unitId: string
  warehouseId: string
  rollNumber: string
  dyeLot: string
  note: string
  location: string
  coverageUnitId: string
  coveragePerUnit: string
  conversionFormulaId: string
  returnedQuantity: string
  area: string
  // Optional adjustment-side extras.
  workOrderId?: string | null
  /** Non-semantic palette tag; omitted → DB default SLATE. */
  color?: PaletteColor
  isWaste?: boolean
}

export type CreateReturnResult = {
  inventory: InventoryResult
  adjustment: InventoryAdjustmentRecord
}
