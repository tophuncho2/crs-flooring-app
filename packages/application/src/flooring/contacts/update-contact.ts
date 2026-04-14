import { Prisma, updateContactRecord, withDatabaseTransaction } from "@builders/db"
import type { ContactInput, ContactResult } from "./types.js"

export async function updateContactUseCase(
  id: string,
  input: ContactInput,
  client?: Prisma.TransactionClient,
): Promise<ContactResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    return updateContactRecord(id, input, c)
  })
}
