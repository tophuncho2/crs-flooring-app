import { getTemplatePreviewById } from "@builders/db"
import type { TemplatePreview } from "@builders/domain"

export type GetTemplatePreviewInput = {
  templateId: string
}

export async function getTemplatePreviewUseCase(
  input: GetTemplatePreviewInput,
): Promise<TemplatePreview> {
  return getTemplatePreviewById(input.templateId)
}
