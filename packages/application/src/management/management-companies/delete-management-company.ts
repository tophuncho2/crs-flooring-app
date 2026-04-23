import {
  Prisma,
  countPropertiesByManagementCompanyId,
  deleteManagementCompanyRecordById,
  withDatabaseTransaction,
} from "@builders/db"
import {
  MANAGEMENT_COMPANY_NOT_FOUND_MESSAGE,
  getManagementCompanyDeleteBlockedMessage,
  isManagementCompanyDeleteBlocked,
} from "@builders/domain"
import { ManagementCompanyExecutionError } from "./errors.js"

export async function deleteManagementCompanyUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const propertyCount = await countPropertiesByManagementCompanyId(id, c)
    const linkState = { propertyCount }

    if (isManagementCompanyDeleteBlocked(linkState)) {
      throw new ManagementCompanyExecutionError({
        code: "MANAGEMENT_COMPANY_IN_USE",
        message: getManagementCompanyDeleteBlockedMessage(linkState),
        status: 409,
      })
    }

    try {
      await deleteManagementCompanyRecordById(id, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ManagementCompanyExecutionError({
          code: "MANAGEMENT_COMPANY_NOT_FOUND",
          message: MANAGEMENT_COMPANY_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }

    return { ok: true }
  })
}
