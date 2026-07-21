import type { WorkOrderEntityInvolvementForm } from "./types.js"

// No required fields — a row may carry any combination of an entity link and a
// free-text involvement type, including neither. Returns "" (always valid); kept
// as the section's validation seam so future rules have one home. The entity FK
// (P2003 → LINK_INVALID) is the only referential backstop.
export function validateWorkOrderEntityInvolvementForm(
  _input: WorkOrderEntityInvolvementForm,
): string {
  return ""
}
