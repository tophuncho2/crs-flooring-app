import { validateCreateTemplateInput, validateUpdateTemplateInput } from "@/features/flooring/templates/validators"
import { createTemplate } from "@/features/flooring/templates/mutations"
import { deleteTemplateRecordUseCase, updateTemplatePrimarySectionUseCase } from "./record-sections"

export async function createTemplateUseCase(body: Record<string, unknown>) {
  return createTemplate(validateCreateTemplateInput(body))
}

export async function updateTemplateUseCase(id: string, body: Record<string, unknown>) {
  return updateTemplatePrimarySectionUseCase(id, validateUpdateTemplateInput(body))
}

export async function deleteTemplateUseCase(id: string) {
  return deleteTemplateRecordUseCase(id)
}
