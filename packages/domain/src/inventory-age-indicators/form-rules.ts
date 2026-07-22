import {
  INVENTORY_AGE_INDICATOR_DAYS_INVALID_MESSAGE,
  INVENTORY_AGE_INDICATOR_DAYS_REQUIRED_MESSAGE,
} from "./error-messages.js"
import { isPaletteColor, PALETTE_COLOR_INVALID_MESSAGE } from "../shared/palette.js"
import type { InventoryAgeIndicatorForm } from "./types.js"

export const INVENTORY_AGE_INDICATOR_DAYS_MIN = 1
export const INVENTORY_AGE_INDICATOR_DAYS_MAX = 100000

/**
 * Parse the form `days` string into a positive integer, or `null` when it is
 * not a whole number in the allowed range. Shared by the client validator below
 * and available to any boundary that needs the coerced value.
 */
export function parseInventoryAgeIndicatorDays(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  if (
    !Number.isInteger(parsed) ||
    parsed < INVENTORY_AGE_INDICATOR_DAYS_MIN ||
    parsed > INVENTORY_AGE_INDICATOR_DAYS_MAX
  ) {
    return null
  }
  return parsed
}

export function validateInventoryAgeIndicatorForm(input: InventoryAgeIndicatorForm) {
  if (!input.days.trim()) return INVENTORY_AGE_INDICATOR_DAYS_REQUIRED_MESSAGE
  if (parseInventoryAgeIndicatorDays(input.days) === null)
    return INVENTORY_AGE_INDICATOR_DAYS_INVALID_MESSAGE
  if (!isPaletteColor(input.color)) return PALETTE_COLOR_INVALID_MESSAGE
  return ""
}
