import { Prisma, createContactRecord, withDatabaseTransaction } from "@builders/db"
import type { ContactInput, ContactResult } from "./types.js"

export async function createContactUseCase(
  input: ContactInput,
  client?: Prisma.TransactionClient,
): Promise<ContactResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    return createContactRecord(input, c)
  })
}
