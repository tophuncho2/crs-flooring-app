import {
  Prisma,
  countWorkOrderCutLogs,
  getWorkOrderById,
  updateWorkOrderRecord,
  withDatabaseTransaction,
} from "@builders/db"
import {
  WORK_ORDER_NOT_FOUND_MESSAGE,
  WORK_ORDER_PROPERTY_REQUIRED_MESSAGE,
  WORK_ORDER_WAREHOUSE_LOCKED_MESSAGE,
  WORK_ORDER_WAREHOUSE_REQUIRED_MESSAGE,
  WorkOrderDomainError,
  assertWorkOrderWarehouseChangeAllowed,
} from "@builders/domain"
import { WorkOrderExecutionError } from "./errors.js"
import type { UpdateWorkOrderUseCaseInput, WorkOrderUseCaseResult } from "./types.js"

/**
 * Updates a work order. Validates the user-supplied fields, enforces
 * the warehouse-change-lock when the patch changes `warehouseId` AND
 * the WO has linked cut logs, then delegates the write.
 *
 * The warehouse-change-lock predicate lives in the domain
 * (`assertWorkOrderWarehouseChangeAllowed`); this use case provides the
 * runtime context (current warehouseId, hasLinkedCutLogs from
 * `countWorkOrderCutLogs`) and converts the thrown
 * `WorkOrderDomainError` into an `WorkOrderExecutionError` carrying
 * HTTP status 409.
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

    if (input.warehouseId !== undefined && (input.warehouseId === null || !input.warehouseId.trim())) {
      throw new WorkOrderExecutionError({
        code: "WORK_ORDER_VALIDATION_FAILED",
        message: WORK_ORDER_WAREHOUSE_REQUIRED_MESSAGE,
        status: 400,
        field: "warehouseId",
      })
    }

    if (input.warehouseId !== undefined) {
      const current = await loadWorkOrderOrThrow(id, c)
      const hasLinkedCutLogs = (await countWorkOrderCutLogs(id, c)) > 0
      try {
        assertWorkOrderWarehouseChangeAllowed({
          currentWarehouseId: current.warehouseId,
          nextWarehouseId: input.warehouseId,
          hasLinkedCutLogs,
        })
      } catch (error) {
        if (error instanceof WorkOrderDomainError && error.code === "WORK_ORDER_WAREHOUSE_LOCKED") {
          throw new WorkOrderExecutionError({
            code: "WORK_ORDER_WAREHOUSE_LOCKED",
            message: WORK_ORDER_WAREHOUSE_LOCKED_MESSAGE,
            status: 409,
            field: "warehouseId",
            payload: error.detail,
          })
        }
        throw error
      }
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

async function loadWorkOrderOrThrow(id: string, client: Prisma.TransactionClient) {
  try {
    return await getWorkOrderById(id, client)
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
}
