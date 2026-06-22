import {
  Prisma,
  createWorkOrderRecord,
  withDatabaseTransaction,
} from "@builders/db"
import type { CreateWorkOrderUseCaseInput, WorkOrderUseCaseResult } from "./types.js"

export async function createWorkOrderUseCase(
  input: CreateWorkOrderUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<WorkOrderUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    // Property is optional — a work order always has an auto-generated number,
    // so there is no "empty record" to guard against.

    // A work order may be created without a warehouse. Adjustments source
    // their warehouse from the chosen inventory, not the WO, so a warehouse
    // is no longer required here.

    return createWorkOrderRecord(input, c)
  })
}
