import { Prisma, updateContactRecord, withDatabaseTransaction } from "@builders/db"
import {
  CONTACT_NAME_REQUIRED_MESSAGE,
  CONTACT_NOT_FOUND_MESSAGE,
} from "@builders/domain"
import { ContactExecutionError } from "./errors.js"
import type { ContactUseCaseResult, UpdateContactUseCaseInput } from "./types.js"

export async function updateContactUseCase(
  id: string,
  input: UpdateContactUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<ContactUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (input.name !== undefined && !input.name.trim()) {
      throw new ContactExecutionError({
        code: "CONTACT_VALIDATION_FAILED",
        message: CONTACT_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "name",
      })
    }

    try {
      return await updateContactRecord(id, input, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ContactExecutionError({
          code: "CONTACT_NOT_FOUND",
          message: CONTACT_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }
  })
}
