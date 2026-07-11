import {
  Prisma,
  updateWorkOrderRecord,
  withDatabaseTransaction,
} from "@builders/db"
import { WORK_ORDER_NOT_FOUND_MESSAGE } from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2025 } from "../shared/prisma-errors.js"
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
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<WorkOrderUseCaseResult> {
  assertActorEmail(actorEmail, "updateWorkOrderUseCase")
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    // Property is optional and freely clearable — passing `null` detaches it.

    try {
      return await updateWorkOrderRecord(id, { ...input, updatedBy: actorEmail }, c)
    } catch (error) {
      if (isP2025(error)) {
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
