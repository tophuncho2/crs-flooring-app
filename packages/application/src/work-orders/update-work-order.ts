import { Prisma, getWorkOrderDetailById, updateWorkOrderRecord } from "@builders/db"
import { WORK_ORDER_NOT_FOUND_MESSAGE } from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2025 } from "../shared/prisma-errors.js"
import { withTxThenEnrich } from "../shared/with-tx-then-enrich.js"
import { WorkOrderExecutionError } from "./errors.js"
import type { UpdateWorkOrderUseCaseInput, WorkOrderUseCaseResult } from "./types.js"

function workOrderNotFound(): WorkOrderExecutionError {
  return new WorkOrderExecutionError({
    code: "WORK_ORDER_NOT_FOUND",
    message: WORK_ORDER_NOT_FOUND_MESSAGE,
    status: 404,
  })
}

/**
 * Updates a work order. The warehouse is optional and freely changeable —
 * adjustments source their warehouse from the chosen inventory, not the work
 * order, so there is no warehouse-change-lock. The write runs lean in the tx;
 * the full record is read on the pool after commit.
 */
export async function updateWorkOrderUseCase(
  id: string,
  input: UpdateWorkOrderUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<WorkOrderUseCaseResult> {
  assertActorEmail(actorEmail, "updateWorkOrderUseCase")

  // Property is optional and freely clearable — passing `null` detaches it.
  try {
    return await withTxThenEnrich(
      (c) => updateWorkOrderRecord(id, { ...input, updatedBy: actorEmail }, c),
      () => getWorkOrderDetailById(id, { withNeighbors: false }),
      () => {
        throw workOrderNotFound()
      },
      { client },
    )
  } catch (error) {
    // The in-tx `.update` throws P2025 when the row is gone.
    if (isP2025(error)) {
      throw workOrderNotFound()
    }
    throw error
  }
}
