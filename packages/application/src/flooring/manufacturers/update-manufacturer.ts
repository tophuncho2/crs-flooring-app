import { Prisma, getManufacturerById, manufacturerCompanyNameExists, updateManufacturerPrimaryRecord } from "@builders/db"
import { isManufacturerCompanyNameConflict, normalizeManufacturerCompanyNameForUniqueness, validateManufacturerForm } from "@builders/domain"
import { ManufacturerExecutionError } from "./errors.js"
import type { ManufacturerInput, ManufacturerResult } from "./types.js"

export function validateUpdateManufacturerPrimarySectionInput(body: Record<string, unknown>): ManufacturerInput {
  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : ""

  if (!companyName) {
    throw new ManufacturerExecutionError({
      code: "MANUFACTURER_VALIDATION_FAILED",
      message: "companyName is required",
      status: 400,
      field: "companyName",
    })
  }

  const input: ManufacturerInput = {
    companyName,
    agentName: typeof body.agentName === "string" ? body.agentName : typeof body.name === "string" ? body.name : "",
    website: typeof body.website === "string" ? body.website : "",
    phone: typeof body.phone === "string" ? body.phone : "",
    email: typeof body.email === "string" ? body.email : "",
  }

  const validationError = validateManufacturerForm(input)
  if (validationError) {
    throw new ManufacturerExecutionError({
      code: "MANUFACTURER_VALIDATION_FAILED",
      message: validationError,
      status: 400,
      field: "companyName",
    })
  }

  return input
}

export async function replaceManufacturerPrimarySection(
  id: string,
  input: ManufacturerInput,
): Promise<ManufacturerResult> {
  const normalizedName = normalizeManufacturerCompanyNameForUniqueness(input.companyName)

  if (isManufacturerCompanyNameConflict(await manufacturerCompanyNameExists(normalizedName, id))) {
    throw new ManufacturerExecutionError({
      code: "MANUFACTURER_NAME_CONFLICT",
      message: "Company name must be unique",
      status: 409,
      field: "companyName",
    })
  }

  try {
    await updateManufacturerPrimaryRecord(id, input)
    return getManufacturerById(id)
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
