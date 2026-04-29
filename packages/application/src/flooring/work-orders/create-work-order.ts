import { Prisma, createWorkOrderRecord, withDatabaseTransaction } from "@builders/db"
import {
  WORK_ORDER_PROPERTY_REQUIRED_MESSAGE,
  WORK_ORDER_WAREHOUSE_REQUIRED_MESSAGE,
} from "@builders/domain"
import { WorkOrderExecutionError } from "./errors.js"
import type { CreateWorkOrderUseCaseInput, WorkOrderUseCaseResult } from "./types.js"

/**
 * Creates a work order. Mirrors the templates create use case shape:
 * the application layer opens a transaction, validates the user-facing
 * required fields, and delegates the write to the data layer.
 *
 * `status` and the template-sync snapshot fields are intentionally
 * absent from the input shape (worker-controlled). Callers (API routes)
 * cannot pass them.
 */
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

    return createWorkOrderRecord(input, c)
  })
}
