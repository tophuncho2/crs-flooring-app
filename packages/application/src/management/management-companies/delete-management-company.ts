import {
  Prisma,
  deleteManagementCompanyRecordById,
  withDatabaseTransaction,
} from "@builders/db"
import { MANAGEMENT_COMPANY_NOT_FOUND_MESSAGE } from "@builders/domain"
import { ManagementCompanyExecutionError } from "./errors.js"

export async function deleteManagementCompanyUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

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
