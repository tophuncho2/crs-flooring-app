import { isValidMoneyAmount } from "../../shared/money.js"
import { isServiceItemType, SERVICE_ITEM_TYPE_INVALID_MESSAGE } from "../../shared/service-item-type.js"
import type { TemplateServiceItemForm } from "./types.js"

// itemType is a REQUIRED enum (ServiceItemType); itemName is free-text/optional.
// The bid-cost money field is optional; a provided value must be a valid money
// amount (defense — the API validator normalizes too). Quantity is optional; a
// provided value must be a finite number greater than zero.
export function validateTemplateServiceItemForm(input: TemplateServiceItemForm) {
  // Required-enum check FIRST — every path below may early-return, so validating
  // itemType up top guarantees a blank/invalid type can never slip past a row that
  // (e.g.) has no quantity.
  if (!isServiceItemType(input.itemType)) {
    return SERVICE_ITEM_TYPE_INVALID_MESSAGE
  }
  const moneyFields: Array<[string, string]> = [
    ["Bid cost", input.bidCost],
  ]
  for (const [label, value] of moneyFields) {
    if (value.trim() && !isValidMoneyAmount(value)) {
      return `${label} must be a valid amount`
    }
  }
  if (!input.quantity.trim()) return ""
  const quantity = Number(input.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return "Quantity must be greater than zero"
  }
  return ""
}
