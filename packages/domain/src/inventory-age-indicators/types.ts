import { DEFAULT_PALETTE_COLOR, type PaletteColor } from "../shared/palette.js"

export type InventoryAgeIndicator = {
  id: string
  days: number
  color: PaletteColor
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

export type InventoryAgeIndicatorListRow = InventoryAgeIndicator

/**
 * The record-view form shape. `days` is held as a string at the form boundary
 * (matches the editable NumberCell + the wire shape); it is coerced to an
 * integer at the API boundary via `requireInt`.
 */
export type InventoryAgeIndicatorForm = {
  days: string
  color: PaletteColor
}

export const EMPTY_INVENTORY_AGE_INDICATOR_FORM: InventoryAgeIndicatorForm = {
  days: "",
  color: DEFAULT_PALETTE_COLOR,
}

export function toInventoryAgeIndicatorForm(
  indicator: InventoryAgeIndicator,
): InventoryAgeIndicatorForm {
  return { days: String(indicator.days), color: indicator.color }
}
