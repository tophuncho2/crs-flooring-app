import { getContactDeleteState, deleteContactRecordById, withDatabaseTransaction } from "@builders/db"
import { isContactDeleteBlocked, getContactDeleteBlockedMessage } from "@builders/domain"
import { ContactExecutionError } from "./errors.js"

export async function deleteContactUseCase(id: string): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const contact = await getContactDeleteState(id, tx)

    if (!contact) {
      throw new ContactExecutionError({
        code: "CONTACT_NOT_FOUND",
        message: "Contact not found",
        status: 404,
      })
    }

    const linkState = {
      templateAssignments: contact._count.templateSalesReps,
      workOrderAssignments: contact._count.workOrderSalesReps,
    }

    if (isContactDeleteBlocked(linkState)) {
      throw new ContactExecutionError({
        code: "CONTACT_IN_USE",
        message: getContactDeleteBlockedMessage(linkState),
        status: 409,
      })
    }

    await deleteContactRecordById(id, tx)

    return { ok: true }
  })
}
