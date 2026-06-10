import { Prisma, createContactRecord, withDatabaseTransaction } from "@builders/db"
import { CONTACT_NAME_REQUIRED_MESSAGE } from "@builders/domain"
import { ContactExecutionError } from "./errors.js"
import type { ContactUseCaseResult, CreateContactUseCaseInput } from "./types.js"

export async function createContactUseCase(
  input: CreateContactUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<ContactUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (!input.name || !input.name.trim()) {
      throw new ContactExecutionError({
        code: "CONTACT_VALIDATION_FAILED",
        message: CONTACT_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "name",
      })
    }

    return createContactRecord(input, c)
  })
}
