import {
  Prisma,
  getProductById,
  updateTemplateMaterialItemRecord,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildItemSendUnitSnapshotFromProduct,
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

    const product = await getProductById(input.form.productId, c)
    if (!product) {
      throw new TemplateMaterialItemExecutionError({
        code: "TEMPLATE_MATERIAL_ITEM_VALIDATION_FAILED",
        message: "Selected product was not found",
        status: 400,
        field: "productId",
      })
    }

    const snapshot = buildItemSendUnitSnapshotFromProduct(product)

    try {
      return await updateTemplateMaterialItemRecord(
        input.id,
        { ...input.form, ...snapshot },
        c,
      )
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
