import { getTemplatePreviewById } from "@builders/db"
import {
  TEMPLATE_PREVIEW_ITEMS_MAX_PAGE_SIZE,
  type TemplatePreview,
} from "@builders/domain"
import { TemplateExecutionError } from "./errors.js"

export type GetTemplatePreviewInput = {
  templateId: string
  itemsPage: number
  itemsPageSize: number
}

function failValidation(message: string, field: string): never {
  throw new TemplateExecutionError({
    code: "TEMPLATE_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

export async function getTemplatePreviewUseCase(
  input: GetTemplatePreviewInput,
): Promise<TemplatePreview> {
  if (!Number.isInteger(input.itemsPage) || input.itemsPage < 1) {
    failValidation("itemsPage must be a positive integer", "itemsPage")
  }
  if (
    !Number.isInteger(input.itemsPageSize) ||
    input.itemsPageSize < 1 ||
    input.itemsPageSize > TEMPLATE_PREVIEW_ITEMS_MAX_PAGE_SIZE
  ) {
    failValidation(
      `itemsPageSize must be between 1 and ${TEMPLATE_PREVIEW_ITEMS_MAX_PAGE_SIZE}`,
      "itemsPageSize",
    )
  }

  return getTemplatePreviewById(input.templateId, {
    itemsPage: input.itemsPage,
    itemsPageSize: input.itemsPageSize,
  })
}
