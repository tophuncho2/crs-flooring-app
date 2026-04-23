import { Prisma, updateTemplateMaterialItemRecord, withDatabaseTransaction } from "@builders/db"
import {
  TEMPLATE_MATERIAL_ITEM_NOT_FOUND_MESSAGE,
  validateTemplateMaterialItemForm,
} from "@builders/domain"
import { TemplateMaterialItemExecutionError } from "./errors.js"
import type {
  TemplateMaterialItemUseCaseResult,
  UpdateTemplateMaterialItemUseCaseInput,
} from "./types.js"

export async function updateTemplateMaterialItemUseCase(
  input: UpdateTemplateMaterialItemUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<TemplateMaterialItemUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const validationError = validateTemplateMaterialItemForm(input.form)
    if (validationError) {
      throw new TemplateMaterialItemExecutionError({
        code: "TEMPLATE_MATERIAL_ITEM_VALIDATION_FAILED",
        message: validationError,
        status: 400,
      })
    }

    try {
      return await updateTemplateMaterialItemRecord(input.id, input.form, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new TemplateMaterialItemExecutionError({
          code: "TEMPLATE_MATERIAL_ITEM_NOT_FOUND",
          message: TEMPLATE_MATERIAL_ITEM_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }
  })
}
