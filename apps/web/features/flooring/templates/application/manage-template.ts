import { createTemplate, deleteTemplate, updateTemplate } from "@/features/flooring/templates/mutations"
import { validateCreateTemplateInput, validateUpdateTemplateInput } from "@/features/flooring/templates/validators"

export async function createTemplateUseCase(body: Record<string, unknown>) {
  return createTemplate(validateCreateTemplateInput(body))
}

export async function updateTemplateUseCase(id: string, body: Record<string, unknown>) {
  return updateTemplate(id, validateUpdateTemplateInput(body))
}

export async function deleteTemplateUseCase(id: string) {
  await deleteTemplate(id)
  return { ok: true as const }
}
