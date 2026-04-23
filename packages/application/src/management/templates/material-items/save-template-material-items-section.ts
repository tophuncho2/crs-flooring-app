import { Prisma, saveTemplateMaterialItemsSection, withDatabaseTransaction } from "@builders/db"
import { validateTemplateMaterialItemForm } from "@builders/domain"
import { TemplateMaterialItemExecutionError } from "./errors.js"
import type {
  SaveTemplateMaterialItemsSectionUseCaseInput,
  TemplateMaterialItemsSectionUseCaseResult,
} from "./types.js"

export async function saveTemplateMaterialItemsSectionUseCase(
  input: SaveTemplateMaterialItemsSectionUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<TemplateMaterialItemsSectionUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    for (const entry of input.next) {
      const validationError = validateTemplateMaterialItemForm(entry.form)
      if (validationError) {
        throw new TemplateMaterialItemExecutionError({
          code: "TEMPLATE_MATERIAL_ITEM_VALIDATION_FAILED",
          message: validationError,
          status: 400,
        })
      }
    }

    return saveTemplateMaterialItemsSection(input.templateId, input.next, c)
  })
}
