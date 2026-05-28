import {
  Prisma,
  deleteImportRecordById,
  getImportLinkState,
  lockImportRow,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildImportDeleteBlockedMessage,
  isImportDeleteBlocked,
} from "@builders/domain"
import { ImportExecutionError } from "./errors.js"

export async function deleteImportUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    await lockImportRow(c, id)

    const state = await getImportLinkState(id, c)
    if (!state) {
      throw new ImportExecutionError({
        code: "IMPORT_NOT_FOUND",
        message: "Import not found.",
        status: 404,
      })
    }

    if (isImportDeleteBlocked(state)) {
      throw new ImportExecutionError({
        code: "IMPORT_DELETE_BLOCKED_BY_INVENTORY",
        message: buildImportDeleteBlockedMessage(state),
        status: 409,
      })
    }

    await deleteImportRecordById(id, c)

    return { ok: true }
  })
}
