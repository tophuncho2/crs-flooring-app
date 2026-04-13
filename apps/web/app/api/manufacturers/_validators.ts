import { ManufacturerExecutionError } from "@builders/application"
import type { ManufacturerInput } from "@builders/application"
import { validateManufacturerForm } from "@builders/domain"

export function validateManufacturerInput(body: Record<string, unknown>): ManufacturerInput {
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
