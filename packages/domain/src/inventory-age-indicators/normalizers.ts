import { toIsoTimestamp } from "../shared/date-format.js"
import type { InventoryAgeIndicator } from "./types.js"
import type { PaletteColor } from "../shared/palette.js"

type InventoryAgeIndicatorInput = {
  id: string
  days: number
  color: PaletteColor
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
  updatedBy: string | null
}

export function normalizeInventoryAgeIndicator(
  indicator: InventoryAgeIndicatorInput,
): InventoryAgeIndicator {
  return {
    id: indicator.id,
    days: indicator.days,
    color: indicator.color,
    createdAt: toIsoTimestamp(indicator.createdAt),
    updatedAt: toIsoTimestamp(indicator.updatedAt),
    createdBy: indicator.createdBy,
    updatedBy: indicator.updatedBy,
  }
}
