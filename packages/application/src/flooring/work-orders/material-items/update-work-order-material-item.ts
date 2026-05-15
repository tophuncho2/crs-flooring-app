import {
  Prisma,
  updateWorkOrderMaterialItemRecord,
  withDatabaseTransaction,
} from "@builders/db"
import { validateWorkOrderMaterialItemUpdateForm } from "@builders/domain"
import { WorkOrderMaterialItemExecutionError } from "./errors.js"
import type {
  UpdateWorkOrderMaterialItemUseCaseInput,
  WorkOrderMaterialItemUseCaseResult,
} from "./types.js"

// productId is locked post-create — the update form omits it, and the
// API validator rejects it on the wire. Snapshots stamped at create
// (productName, sendUnitName, sendUnitAbbrev) stay valid because the
// product can't change, so this use case writes only quantity + notes.
export async function updateWorkOrderMaterialItemUseCase(
  input: UpdateWorkOrderMaterialItemUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<WorkOrderMaterialItemUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const validationError = validateWorkOrderMaterialItemUpdateForm(input.form)
    if (validationError) {
      throw new WorkOrderMaterialItemExecutionError({
        code: "WORK_ORDER_MATERIAL_ITEM_VALIDATION_FAILED",
        message: validationError,
        status: 400,
      })
    }

    try {
      return await updateWorkOrderMaterialItemRecord(input.id, input.form, c)
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
