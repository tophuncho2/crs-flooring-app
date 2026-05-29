import {
  Prisma,
  updateWorkOrderRecord,
  withDatabaseTransaction,
} from "@builders/db"
import {
  WORK_ORDER_NOT_FOUND_MESSAGE,
  WORK_ORDER_PROPERTY_REQUIRED_MESSAGE,
} from "@builders/domain"
import { WorkOrderExecutionError } from "./errors.js"
import type { UpdateWorkOrderUseCaseInput, WorkOrderUseCaseResult } from "./types.js"

/**
 * Updates a work order. Validates the user-supplied fields, then delegates
 * the write. The warehouse is optional and freely changeable — adjustments
 * source their warehouse from the chosen inventory, not the work order, so
 * there is no warehouse-change-lock.
 */
export async function updateWorkOrderUseCase(
  id: string,
  input: UpdateWorkOrderUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<WorkOrderUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (input.propertyId !== undefined && (input.propertyId === null || !input.propertyId.trim())) {
      throw new WorkOrderExecutionError({
        code: "WORK_ORDER_VALIDATION_FAILED",
        message: WORK_ORDER_PROPERTY_REQUIRED_MESSAGE,
        status: 400,
        field: "propertyId",
      })
    }

    try {
      return await updateWorkOrderRecord(id, input, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new WorkOrderExecutionError({
          code: "WORK_ORDER_NOT_FOUND",
          message: WORK_ORDER_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }
  })
}
