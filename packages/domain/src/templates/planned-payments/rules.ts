import { validatePlannedPaymentForm } from "../../shared/planned-payment-rules.js"
import type { TemplatePlannedPaymentForm } from "./types.js"

// Amount is REQUIRED and must be a positive money value; direction must be a known
// value. Returns "" when valid, else a human message (the templates child-section
// convention). Shares the rule with the work-order planned-payment section.
export function validateTemplatePlannedPaymentForm(input: TemplatePlannedPaymentForm) {
  return validatePlannedPaymentForm(input)
}
