import { isValidMoneyAmount } from "./money.js"

// Positive-money + known-direction rule behind the template and work-order
// planned-payment child sections. Returns "" when valid, else a human message
// (the child-section convention). Direction is typed loosely so callers can pass
// their module's FlooringPaymentDirection form without a layering back-edge.
export function validatePlannedPaymentForm(input: { amount: string; direction: string }): string {
  const raw = input.amount.trim()
  if (raw.length === 0) return "Amount is required"
  if (!isValidMoneyAmount(raw)) return "Amount must be a valid amount"
  if (Number(raw) <= 0) return "Amount must be greater than zero"
  if (input.direction !== "REVENUE" && input.direction !== "EXPENSE") {
    return "Direction (revenue or expense) is required"
  }
  return ""
}
