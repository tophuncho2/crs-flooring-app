import { listTemplatePreviewMaterialItemsById } from "@builders/db"
import {
  TEMPLATE_PREVIEW_ITEMS_MAX_PAGE_SIZE,
  type TemplatePreviewMaterialItemPage,
} from "@builders/domain"
import { TemplateExecutionError } from "./errors.js"

export type ListTemplatePreviewMaterialItemsInput = {
  templateId: string
  page: number
  pageSize: number
}

function failValidation(message: string, field: string): never {
  throw new TemplateExecutionError({
    code: "TEMPLATE_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

export async function listTemplatePreviewMaterialItemsUseCase(
  input: ListTemplatePreviewMaterialItemsInput,
): Promise<TemplatePreviewMaterialItemPage> {
  if (!Number.isInteger(input.page) || input.page < 1) {
    failValidation("page must be a positive integer", "page")
  }
  if (
    !Number.isInteger(input.pageSize) ||
    input.pageSize < 1 ||
    input.pageSize > TEMPLATE_PREVIEW_ITEMS_MAX_PAGE_SIZE
  ) {
    failValidation(
      `pageSize must be between 1 and ${TEMPLATE_PREVIEW_ITEMS_MAX_PAGE_SIZE}`,
      "pageSize",
    )
  }

  return listTemplatePreviewMaterialItemsById(input.templateId, {
    page: input.page,
    pageSize: input.pageSize,
  })
}
