import {
  Prisma,
  createWorkOrderMaterialItemRecord,
  getProductById,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildItemSendUnitSnapshotFromProduct,
  validateWorkOrderMaterialItemForm,
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

    return createWorkOrderMaterialItemRecord(
      input.workOrderId,
      { ...input.form, ...snapshot },
      c,
    )
  })
}
