import { Prisma, getContactDeleteState, deleteContactRecordById, withDatabaseTransaction } from "@builders/db"
import { isContactDeleteBlocked, getContactDeleteBlockedMessage } from "@builders/domain"
import { ContactExecutionError } from "./errors.js"

export async function deleteContactUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const contact = await getContactDeleteState(id, c)

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

    await deleteContactRecordById(id, c)

    return { ok: true }
  })
}
