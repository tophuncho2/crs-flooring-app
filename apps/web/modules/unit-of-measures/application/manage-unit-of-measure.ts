import { createAppError } from "@/server/http/api-helpers"
import { normalizeUnitOfMeasureInput } from "@/server/builder/unit-of-measures"
import { validateUnitOfMeasureForm } from "../domain/types"

export function validateUpdateUnitOfMeasurePrimarySectionInput(body: Record<string, unknown>) {
  const input = normalizeUnitOfMeasureInput(body)
  const validationError = validateUnitOfMeasureForm(input)
  if (validationError) {
    throw createAppError(validationError, { field: "name" })
  }

  return input
}
