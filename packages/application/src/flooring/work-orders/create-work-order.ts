import {
  Prisma,
  createWorkOrderRecord,
  getWorkOrderStatusIdBySlug,
  withDatabaseTransaction,
} from "@builders/db"
import {
  WORK_ORDER_PROPERTY_REQUIRED_MESSAGE,
  WORK_ORDER_WAREHOUSE_REQUIRED_MESSAGE,
} from "@builders/domain"
import { WorkOrderExecutionError } from "./errors.js"
import type { CreateWorkOrderUseCaseInput, WorkOrderUseCaseResult } from "./types.js"

export async function createWorkOrderUseCase(
  input: CreateWorkOrderUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<WorkOrderUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (!input.propertyId || !input.propertyId.trim()) {
      throw new WorkOrderExecutionError({
        code: "WORK_ORDER_VALIDATION_FAILED",
        message: WORK_ORDER_PROPERTY_REQUIRED_MESSAGE,
        status: 400,
        field: "propertyId",
      })
    }

    if (!input.warehouseId || !input.warehouseId.trim()) {
      throw new WorkOrderExecutionError({
        code: "WORK_ORDER_VALIDATION_FAILED",
        message: WORK_ORDER_WAREHOUSE_REQUIRED_MESSAGE,
        status: 400,
        field: "warehouseId",
      })
    }

    // Every work order carries an explicit status; default new ones to
    // "None" unless the caller picked one.
    const statusId = input.statusId ?? (await getWorkOrderStatusIdBySlug("none", c))

    return createWorkOrderRecord({ ...input, statusId }, c)
  })
}
