import {
  Prisma,
  getProductById,
  updateWorkOrderMaterialItemRecord,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildItemSendUnitSnapshotFromProduct,
  validateWorkOrderMaterialItemForm,
} from "@builders/domain"
import { WorkOrderMaterialItemExecutionError } from "./errors.js"
import type {
  UpdateWorkOrderMaterialItemUseCaseInput,
  WorkOrderMaterialItemUseCaseResult,
} from "./types.js"

export async function updateWorkOrderMaterialItemUseCase(
  input: UpdateWorkOrderMaterialItemUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<WorkOrderMaterialItemUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const validationError = validateWorkOrderMaterialItemForm(input.form)
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

    const snapshot = buildItemSendUnitSnapshotFromProduct(product)

    try {
      return await updateWorkOrderMaterialItemRecord(
        input.id,
        { ...input.form, ...snapshot },
        c,
      )
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new WorkOrderMaterialItemExecutionError({
          code: "WORK_ORDER_MATERIAL_ITEM_NOT_FOUND",
          message: "Work order material item not found",
          status: 404,
        })
      }
      throw error
    }
  })
}
