import {
  Prisma,
  createWorkOrderDocumentTypeRecord,
  withDatabaseTransaction,
} from "@builders/db"
import {
  WORK_ORDER_DOCUMENT_TYPE_NAME_CONFLICT_MESSAGE,
  WORK_ORDER_DOCUMENT_TYPE_NAME_REQUIRED_MESSAGE,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2002 } from "../shared/prisma-errors.js"
import { WorkOrderDocumentTypeExecutionError } from "./errors.js"
import type {
  CreateWorkOrderDocumentTypeUseCaseInput,
  WorkOrderDocumentTypeUseCaseResult,
} from "./types.js"

export async function createWorkOrderDocumentTypeUseCase(
  input: CreateWorkOrderDocumentTypeUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<WorkOrderDocumentTypeUseCaseResult> {
  assertActorEmail(actorEmail, "createWorkOrderDocumentTypeUseCase")

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (!input.name || !input.name.trim()) {
      throw new WorkOrderDocumentTypeExecutionError({
        code: "WORK_ORDER_DOCUMENT_TYPE_VALIDATION_FAILED",
        message: WORK_ORDER_DOCUMENT_TYPE_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "name",
      })
    }

    try {
      return await createWorkOrderDocumentTypeRecord(
        { ...input, createdBy: actorEmail, updatedBy: actorEmail },
        c,
      )
    } catch (error) {
      if (isP2002(error, "name")) {
        throw new WorkOrderDocumentTypeExecutionError({
          code: "WORK_ORDER_DOCUMENT_TYPE_NAME_CONFLICT",
          message: WORK_ORDER_DOCUMENT_TYPE_NAME_CONFLICT_MESSAGE,
          status: 409,
          field: "name",
        })
      }
      throw error
    }
  })
}
