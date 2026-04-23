import type { TemplateDetail, TemplateForm } from "./types.js"

export function validateTemplateForm(input: TemplateForm) {
  if (!input.propertyId) return "Property is required"
  if (!input.unitType.trim()) return "Unit type is required"
  return ""
}

export function toTemplateForm(template: TemplateDetail): TemplateForm {
  return {
    propertyId: template.propertyId,
    managementCompanyId: template.managementCompanyId ?? "",
    jobTypeId: template.jobTypeId ?? "",
    warehouseId: template.warehouseId ?? "",
    unitType: template.unitType,
    description: template.description,
    instructions: template.instructions,
    propertyInstructions: template.propertyInstructions,
    templateNotes: template.templateNotes,
  }
}
