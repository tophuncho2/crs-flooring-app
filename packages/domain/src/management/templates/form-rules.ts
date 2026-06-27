import type { TemplateDetail, TemplateForm } from "./types.js"

export function validateTemplateForm(input: TemplateForm) {
  // Property is optional — a template always has an auto-generated number, so a
  // record is never empty even with no property. Unit type stays required: it is
  // the defining attribute of a template.
  if (!input.unitType.trim()) return "Unit type is required"
  return ""
}

export function toTemplateForm(template: TemplateDetail): TemplateForm {
  return {
    propertyId: template.propertyId ?? "",
    jobTypeId: template.jobTypeId ?? "",
    warehouseId: template.warehouseId ?? "",
    unitType: template.unitType,
    description: template.description,
    internalNotes: template.internalNotes,
    installerInstructions: template.installerInstructions,
    color: template.color,
  }
}
