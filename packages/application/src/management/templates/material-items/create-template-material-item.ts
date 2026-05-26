import {
  Prisma,
  createTemplateMaterialItemRecord,
  getProductById,
  listTemplateMaterialItems,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildItemSendUnitSnapshotFromProduct,
  buildTemplateMaterialItemDuplicateProductMessage,
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

    // One product per template. Pre-check for a precise error; the DB
    // unique constraint + the P2002 catch below cover any concurrent insert.
    const existing = await listTemplateMaterialItems(input.templateId, c)
    if (existing.some((row) => row.productId === input.form.productId)) {
      throw new TemplateMaterialItemExecutionError({
        code: "TEMPLATE_MATERIAL_ITEM_DUPLICATE_PRODUCT",
        message: buildTemplateMaterialItemDuplicateProductMessage(),
        status: 409,
        field: "productId",
        payload: { productId: input.form.productId },
      })
    }

    const snapshot = buildItemSendUnitSnapshotFromProduct(product)

    try {
      return await createTemplateMaterialItemRecord(
        input.templateId,
        { ...input.form, ...snapshot },
        c,
      )
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new TemplateMaterialItemExecutionError({
          code: "TEMPLATE_MATERIAL_ITEM_DUPLICATE_PRODUCT",
          message: buildTemplateMaterialItemDuplicateProductMessage(),
          status: 409,
          field: "productId",
          payload: { productId: input.form.productId },
        })
      }
      throw error
    }
  })
}
