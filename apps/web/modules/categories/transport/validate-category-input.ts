import { createAppError, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { validateCategoryForm, type CategoryForm } from "../domain/types"

export function validateCategoryPrimarySectionInput(body: Record<string, unknown>): CategoryForm {
  const form: CategoryForm = {
    name: parseRequiredString(body.name, "name"),
    sendUnitId: parseOptionalString(body.sendUnitId) ?? "",
    stockUnitId: parseOptionalString(body.stockUnitId) ?? "",
    coverageAvailableUnitId: parseOptionalString(body.coverageAvailableUnitId) ?? "",
    itemCoverageUnitId: parseOptionalString(body.itemCoverageUnitId) ?? "",
    serviceUnitId: parseOptionalString(body.serviceUnitId) ?? "",
  }

  const validationError = validateCategoryForm(form)
  if (validationError) {
    throw createAppError(validationError, { field: "name" })
  }

  return form
}
