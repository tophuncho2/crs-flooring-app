import {
  Prisma,
  deleteWorkOrderDocumentTypeRecordById,
  withDatabaseTransaction,
} from "@builders/db"
import { WORK_ORDER_DOCUMENT_TYPE_NOT_FOUND_MESSAGE } from "@builders/domain"
import { isP2025 } from "../shared/prisma-errors.js"
import { WorkOrderDocumentTypeExecutionError } from "./errors.js"

export async function deleteWorkOrderDocumentTypeUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    try {
      await deleteWorkOrderDocumentTypeRecordById(id, c)
    } catch (error) {
      if (isP2025(error)) {
        throw new WorkOrderDocumentTypeExecutionError({
          code: "WORK_ORDER_DOCUMENT_TYPE_NOT_FOUND",
          message: WORK_ORDER_DOCUMENT_TYPE_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }

    return { ok: true }
  })
}
