import { Prisma, createWorkOrderRecord, getWorkOrderDetailById } from "@builders/db"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { withTxThenEnrich } from "../shared/with-tx-then-enrich.js"
import type { CreateWorkOrderUseCaseInput, WorkOrderUseCaseResult } from "./types.js"

export async function createWorkOrderUseCase(
  input: CreateWorkOrderUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<WorkOrderUseCaseResult> {
  assertActorEmail(actorEmail, "createWorkOrderUseCase")

  // Property and warehouse are both optional — a work order always has an
  // auto-generated number, and adjustments source their warehouse from the
  // chosen inventory, so neither is required here.
  return withTxThenEnrich(
    (c) => createWorkOrderRecord({ ...input, createdBy: actorEmail, updatedBy: actorEmail }, c),
    ({ id }) => getWorkOrderDetailById(id, { withNeighbors: false }),
    () => {
      throw new Error("createWorkOrderUseCase: work order not found after insert")
    },
    { client },
  )
}
