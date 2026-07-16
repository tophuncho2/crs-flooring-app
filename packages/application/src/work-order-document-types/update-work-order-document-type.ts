import {
  Prisma,
  updateWorkOrderDocumentTypeRecord,
  withDatabaseTransaction,
} from "@builders/db"
import {
  WORK_ORDER_DOCUMENT_TYPE_NAME_CONFLICT_MESSAGE,
  WORK_ORDER_DOCUMENT_TYPE_NAME_REQUIRED_MESSAGE,
  WORK_ORDER_DOCUMENT_TYPE_NOT_FOUND_MESSAGE,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2002, isP2025 } from "../shared/prisma-errors.js"
import { WorkOrderDocumentTypeExecutionError } from "./errors.js"
import type {
  UpdateWorkOrderDocumentTypeUseCaseInput,
  WorkOrderDocumentTypeUseCaseResult,
} from "./types.js"

export async function updateWorkOrderDocumentTypeUseCase(
  id: string,
  input: UpdateWorkOrderDocumentTypeUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<WorkOrderDocumentTypeUseCaseResult> {
  assertActorEmail(actorEmail, "updateWorkOrderDocumentTypeUseCase")

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (input.name !== undefined && !input.name.trim()) {
      throw new WorkOrderDocumentTypeExecutionError({
        code: "WORK_ORDER_DOCUMENT_TYPE_VALIDATION_FAILED",
        message: WORK_ORDER_DOCUMENT_TYPE_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "name",
      })
    }

    try {
      return await updateWorkOrderDocumentTypeRecord(id, { ...input, updatedBy: actorEmail }, c)
    } catch (error) {
      if (isP2002(error, "name")) {
        throw new WorkOrderDocumentTypeExecutionError({
          code: "WORK_ORDER_DOCUMENT_TYPE_NAME_CONFLICT",
          message: WORK_ORDER_DOCUMENT_TYPE_NAME_CONFLICT_MESSAGE,
          status: 409,
          field: "name",
        })
      }
      if (isP2025(error)) {
        throw new WorkOrderDocumentTypeExecutionError({
          code: "WORK_ORDER_DOCUMENT_TYPE_NOT_FOUND",
          message: WORK_ORDER_DOCUMENT_TYPE_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }
  })
}
