import { normalizeMoneyAmount } from "../../shared/money.js"
import { parseInventoryDecimal } from "./formatters.js"

/**
 * The share of a parent inventory money figure (cost or freight) attributable to
 * an adjustment of `quantity` units: `total × quantity / startingStock`, rounded
 * to the money scale and returned **unsigned** (the +/− sign is derived from the
 * adjustment type at display). Returns `null` when `total` is absent or
 * `startingStock` is zero/garbage (no divisor) so callers persist null, not 0.
 */
export function computeAdjustmentMoneyShare(
  total: string | null,
  startingStock: string,
  quantity: string,
): string | null {
  if (total == null || total.trim() === "") return null
  const starting = parseInventoryDecimal(startingStock)
  if (starting === 0) return null
  const share = (parseInventoryDecimal(total) * parseInventoryDecimal(quantity)) / starting
  if (!Number.isFinite(share)) return null
  const normalized = normalizeMoneyAmount(share)
  return normalized === "" ? null : normalized
}

export function computeInventoryBalance(input: {
  startingStock: string
  netDeducted: string
}): number {
  const starting = parseInventoryDecimal(input.startingStock)
  const netDeducted = parseInventoryDecimal(input.netDeducted)
  const balance = starting - netDeducted
  return balance < 0 ? 0 : balance
}

export function buildInventoryOversoldMessage(input: {
  requestedQuantity: string
  availableBalance: string
  stockUnitAbbrev: string | null
}): string {
  const unit =
    input.stockUnitAbbrev && input.stockUnitAbbrev.length > 0 ? ` ${input.stockUnitAbbrev}` : ""
  return `Cannot deduct ${input.requestedQuantity}${unit}: only ${input.availableBalance}${unit} available.`
}
