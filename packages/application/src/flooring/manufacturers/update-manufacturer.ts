import { Prisma, manufacturerCompanyNameExists, updateManufacturerPrimaryRecord, withDatabaseTransaction } from "@builders/db"
import { isManufacturerCompanyNameConflict, normalizeManufacturerCompanyNameForUniqueness } from "@builders/domain"
import { ManufacturerExecutionError } from "./errors.js"
import type { ManufacturerInput, ManufacturerResult } from "./types.js"

export async function updateManufacturerUseCase(
  id: string,
  input: ManufacturerInput,
  client?: Prisma.TransactionClient,
): Promise<ManufacturerResult> {
  const normalizedName = normalizeManufacturerCompanyNameForUniqueness(input.companyName)

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (isManufacturerCompanyNameConflict(await manufacturerCompanyNameExists(normalizedName, id, c))) {
      throw new ManufacturerExecutionError({
        code: "MANUFACTURER_NAME_CONFLICT",
        message: "Company name must be unique",
        status: 409,
        field: "companyName",
      })
    }

    try {
      return await updateManufacturerPrimaryRecord(id, {
        ...input,
        companyNameNormalized: normalizedName,
      }, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ManufacturerExecutionError({
          code: "MANUFACTURER_NAME_CONFLICT",
          message: "Company name must be unique",
          status: 409,
          field: "companyName",
        })
      }

      throw error
    }
  })
}
