import { Prisma, createManufacturerPrimaryRecord, manufacturerCompanyNameExists } from "@builders/db"
import { isManufacturerCompanyNameConflict, normalizeManufacturerCompanyNameForUniqueness } from "@builders/domain"
import { ManufacturerExecutionError } from "./errors.js"
import type { ManufacturerInput, ManufacturerResult } from "./types.js"

export async function createManufacturerRecord(input: ManufacturerInput): Promise<ManufacturerResult> {
  const normalizedName = normalizeManufacturerCompanyNameForUniqueness(input.companyName)

  if (isManufacturerCompanyNameConflict(await manufacturerCompanyNameExists(normalizedName))) {
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
    })
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
}
