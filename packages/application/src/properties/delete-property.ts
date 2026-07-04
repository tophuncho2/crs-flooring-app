import {
  Prisma,
  countTemplatesByPropertyId,
  deletePropertyRecordById,
  withDatabaseTransaction,
} from "@builders/db"
import {
  PROPERTY_NOT_FOUND_MESSAGE,
  getPropertyDeleteBlockedMessage,
  isPropertyDeleteBlocked,
} from "@builders/domain"
import { PropertyExecutionError } from "./errors.js"

export async function deletePropertyUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const templateCount = await countTemplatesByPropertyId(id, c)
    const linkState = { templateCount }

    if (isPropertyDeleteBlocked(linkState)) {
      throw new PropertyExecutionError({
        code: "PROPERTY_IN_USE",
        message: getPropertyDeleteBlockedMessage(linkState),
        status: 409,
      })
    }

    try {
      await deletePropertyRecordById(id, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new PropertyExecutionError({
          code: "PROPERTY_NOT_FOUND",
          message: PROPERTY_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }

    return { ok: true }
  })
}
