import {
  Prisma,
  createWorkOrderMaterialItemRecord,
  getProductById,
  listWorkOrderMaterialItems,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildItemSendUnitSnapshotFromProduct,
  buildWorkOrderMaterialItemDuplicateProductMessage,
  validateWorkOrderMaterialItemCreateForm,
} from "@builders/domain"
import { WorkOrderMaterialItemExecutionError } from "./errors.js"
import type {
  CreateWorkOrderMaterialItemUseCaseInput,
  WorkOrderMaterialItemUseCaseResult,
} from "./types.js"

export async function createWorkOrderMaterialItemUseCase(
  input: CreateWorkOrderMaterialItemUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<WorkOrderMaterialItemUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const validationError = validateWorkOrderMaterialItemCreateForm(input.form)
    if (validationError) {
      throw new WorkOrderMaterialItemExecutionError({
        code: "WORK_ORDER_MATERIAL_ITEM_VALIDATION_FAILED",
        message: validationError,
        status: 400,
      })
    }

    const product = await getProductById(input.form.productId, c)
    if (!product) {
      throw new WorkOrderMaterialItemExecutionError({
        code: "WORK_ORDER_MATERIAL_ITEM_VALIDATION_FAILED",
        message: "Selected product was not found",
        status: 400,
        field: "productId",
      })
    }

    // One product per work order. Pre-check for a precise error; the DB
    // unique constraint + the P2002 catch below cover any concurrent insert.
    const existing = await listWorkOrderMaterialItems(input.workOrderId, c)
    if (existing.some((row) => row.productId === input.form.productId)) {
      throw new WorkOrderMaterialItemExecutionError({
        code: "WORK_ORDER_MATERIAL_ITEM_DUPLICATE_PRODUCT",
        message: buildWorkOrderMaterialItemDuplicateProductMessage(),
        status: 409,
        field: "productId",
        payload: { productId: input.form.productId },
      })
    }

    const snapshot = buildItemSendUnitSnapshotFromProduct(product)

    try {
      return await createWorkOrderMaterialItemRecord(
        input.workOrderId,
        { ...input.form, ...snapshot },
        c,
      )
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new WorkOrderMaterialItemExecutionError({
          code: "WORK_ORDER_MATERIAL_ITEM_DUPLICATE_PRODUCT",
          message: buildWorkOrderMaterialItemDuplicateProductMessage(),
          status: 409,
          field: "productId",
          payload: { productId: input.form.productId },
        })
      }
      throw error
    }
  })
}
