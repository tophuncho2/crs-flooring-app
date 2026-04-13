import { Prisma, createManufacturerPrimaryRecord, manufacturerCompanyNameExists, withDatabaseTransaction } from "@builders/db"
import { isManufacturerCompanyNameConflict, normalizeManufacturerCompanyNameForUniqueness } from "@builders/domain"
import { ManufacturerExecutionError } from "./errors.js"
import type { ManufacturerInput, ManufacturerResult } from "./types.js"

export async function createManufacturerRecord(
  input: ManufacturerInput,
  client?: Prisma.TransactionClient,
): Promise<ManufacturerResult> {
  const normalizedName = normalizeManufacturerCompanyNameForUniqueness(input.companyName)

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (isManufacturerCompanyNameConflict(await manufacturerCompanyNameExists(normalizedName, undefined, c))) {
      throw new ManufacturerExecutionError({
        code: "MANUFACTURER_NAME_CONFLICT",
        message: "Company name must be unique",
        status: 409,
        field: "companyName",
      })
    }

    try {
      return await createManufacturerPrimaryRecord({
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
