import { createAppError, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { getCategoryById } from "../data/queries"
import {
  createCategoryPrimaryRecord,
  categoryNameExists,
  deleteCategoryRecordById,
  getCategoryDeleteState,
  updateCategoryPrimaryRecord,
} from "../data/server-records"
import { isCategoryDeleteBlocked, isCategoryNameConflict, normalizeCategoryNameForUniqueness } from "../domain/category-rules"
import { validateCategoryForm } from "../validators"
import type { CategoryForm } from "../domain/types"

function parseCategoryForm(body: Record<string, unknown>): CategoryForm {
  return {
    name: parseRequiredString(body.name, "name"),
    sendUnitId: parseOptionalString(body.sendUnitId) ?? "",
    stockUnitId: parseOptionalString(body.stockUnitId) ?? "",
    coverageAvailableUnitId: parseOptionalString(body.coverageAvailableUnitId) ?? "",
    itemCoverageUnitId: parseOptionalString(body.itemCoverageUnitId) ?? "",
    serviceUnitId: parseOptionalString(body.serviceUnitId) ?? "",
  }
}

async function assertCategoryNameAvailable(name: string, currentId?: string) {
  if (isCategoryNameConflict(await categoryNameExists(name, currentId))) {
    throw createAppError("Category name must be unique", {
      status: 409,
      field: "name",
    })
  }
}

export function validateUpdateCategoryPrimarySectionInput(body: Record<string, unknown>) {
  const input = parseCategoryForm(body)
  const validationError = validateCategoryForm(input)
  if (validationError) {
    throw createAppError(validationError, { field: "name" })
  }

  return input
}

export async function createCategoryRecord(input: CategoryForm) {
  await assertCategoryNameAvailable(normalizeCategoryNameForUniqueness(input.name))
  return createCategoryPrimaryRecord(input)
}

export async function replaceCategoryPrimarySection(id: string, input: CategoryForm) {
  await assertCategoryNameAvailable(normalizeCategoryNameForUniqueness(input.name), id)
  await updateCategoryPrimaryRecord(id, input)
  return getCategoryById(id)
}

export async function deleteCategoryRecord(id: string) {
  const category = await getCategoryDeleteState(id)

  if (!category) {
    throw createAppError("Category not found", { status: 404 })
  }

  if (isCategoryDeleteBlocked(category._count.products)) {
    throw createAppError("This category is linked to products and cannot be deleted", {
      status: 409,
      field: "products",
    })
  }

  await deleteCategoryRecordById(id)

  return { ok: true as const }
}
