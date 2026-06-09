import { parseInventoryDecimal } from "./formatters.js"

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
