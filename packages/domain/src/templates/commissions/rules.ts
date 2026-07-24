import { isValidPercent, PERCENT_MAX } from "../../shared/percent.js"
import type { TemplateCommissionForm } from "./types.js"

export const TEMPLATE_COMMISSION_PERCENT_INVALID_MESSAGE =
  "Commission percent must be between 0 and 100"

// No required fields (mirrors the entity-involvement child section) — a commission
// row may carry an entity link and/or a percent. The only rule: a provided percent
// must be a valid scale-3 percent ≤ 100 (defense — the API validator normalizes
// too). Returns "" when valid, else a human message (the templates child-section
// convention). Entity referential validity is the FK's job.
export function validateTemplateCommissionForm(input: TemplateCommissionForm) {
  if (input.percent.trim() && !isValidPercent(input.percent, PERCENT_MAX)) {
    return TEMPLATE_COMMISSION_PERCENT_INVALID_MESSAGE
  }
  return ""
}
