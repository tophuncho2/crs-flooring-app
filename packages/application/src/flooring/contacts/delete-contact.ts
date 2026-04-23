import { Prisma, getContactDeleteState, deleteContactRecordById, withDatabaseTransaction } from "@builders/db"
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

    await deleteContactRecordById(id, c)

    return { ok: true }
  })
}
