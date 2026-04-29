import {
  Prisma,
  createTemplateMaterialItemRecord,
  getProductById,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildItemSendUnitSnapshotFromProduct,
  validateTemplateMaterialItemForm,
} from "@builders/domain"
import { TemplateMaterialItemExecutionError } from "./errors.js"
import type {
  CreateTemplateMaterialItemUseCaseInput,
  TemplateMaterialItemUseCaseResult,
} from "./types.js"

export async function createTemplateMaterialItemUseCase(
  input: CreateTemplateMaterialItemUseCaseInput,
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

    return createTemplateMaterialItemRecord(
      input.templateId,
      { ...input.form, ...snapshot },
      c,
    )
  })
}
