import { Prisma, updateManagementCompanyRecord, withDatabaseTransaction } from "@builders/db"
import {
  MANAGEMENT_COMPANY_NAME_CONFLICT_MESSAGE,
  MANAGEMENT_COMPANY_NAME_REQUIRED_MESSAGE,
  MANAGEMENT_COMPANY_NOT_FOUND_MESSAGE,
} from "@builders/domain"
import { isP2002 } from "../../shared/prisma-errors.js"
import { ManagementCompanyExecutionError } from "./errors.js"
import type {
  ManagementCompanyUseCaseResult,
  UpdateManagementCompanyUseCaseInput,
} from "./types.js"

export async function updateManagementCompanyUseCase(
  id: string,
  input: UpdateManagementCompanyUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<ManagementCompanyUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (input.name !== undefined && !input.name.trim()) {
      throw new ManagementCompanyExecutionError({
        code: "MANAGEMENT_COMPANY_VALIDATION_FAILED",
        message: MANAGEMENT_COMPANY_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "name",
      })
    }

    try {
      return await updateManagementCompanyRecord(id, input, c)
    } catch (error) {
      if (isP2002(error, "name")) {
        throw new ManagementCompanyExecutionError({
          code: "MANAGEMENT_COMPANY_NAME_CONFLICT",
          message: MANAGEMENT_COMPANY_NAME_CONFLICT_MESSAGE,
          status: 409,
          field: "name",
        })
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ManagementCompanyExecutionError({
          code: "MANAGEMENT_COMPANY_NOT_FOUND",
          message: MANAGEMENT_COMPANY_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }
  })
}
