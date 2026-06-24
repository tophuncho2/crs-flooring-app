import { Prisma, createManagementCompanyRecord, withDatabaseTransaction } from "@builders/db"
import {
  MANAGEMENT_COMPANY_NAME_REQUIRED_MESSAGE,
  isBlankName,
} from "@builders/domain"
import { ManagementCompanyExecutionError } from "./errors.js"
import type {
  CreateManagementCompanyUseCaseInput,
  ManagementCompanyUseCaseResult,
} from "./types.js"

export async function createManagementCompanyUseCase(
  input: CreateManagementCompanyUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<ManagementCompanyUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (isBlankName(input.name)) {
      throw new ManagementCompanyExecutionError({
        code: "MANAGEMENT_COMPANY_VALIDATION_FAILED",
        message: MANAGEMENT_COMPANY_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "name",
      })
    }

    return await createManagementCompanyRecord(input, c)
  })
}
