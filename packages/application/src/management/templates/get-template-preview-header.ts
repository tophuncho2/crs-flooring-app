import { getTemplatePreviewHeaderById } from "@builders/db"
import type { TemplatePreviewHeader } from "@builders/domain"

export type GetTemplatePreviewHeaderInput = {
  templateId: string
}

export async function getTemplatePreviewHeaderUseCase(
  input: GetTemplatePreviewHeaderInput,
): Promise<TemplatePreviewHeader> {
  return getTemplatePreviewHeaderById(input.templateId)
}
