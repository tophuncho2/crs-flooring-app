import { createAppError, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import type { CategoryForm } from "../domain/types"

export function validateCategoryPrimarySectionInput(body: Record<string, unknown>): CategoryForm {
  const name = parseRequiredString(body.name, "name")

  if (!name.trim()) {
    throw createAppError("Category name is required", { field: "name" })
  }

  return {
    name,
    sendUnitId: parseOptionalString(body.sendUnitId) ?? "",
    stockUnitId: parseOptionalString(body.stockUnitId) ?? "",
    coverageAvailableUnitId: parseOptionalString(body.coverageAvailableUnitId) ?? "",
    itemCoverageUnitId: parseOptionalString(body.itemCoverageUnitId) ?? "",
    serviceUnitId: parseOptionalString(body.serviceUnitId) ?? "",
  }
}
