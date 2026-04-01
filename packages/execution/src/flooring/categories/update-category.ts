import {
  Prisma,
  categoryNameExists,
  getCategoryById,
  updateCategoryRecord,
  withDatabaseTransaction,
} from "@builders/db"
import { normalizeCategoryNameForUniqueness } from "@builders/domain"
import { CategoryExecutionError } from "./errors.js"
import type { CategoryFormInput } from "./create-category.js"

export async function updateCategoryUseCase(id: string, input: CategoryFormInput) {
  return withDatabaseTransaction(async (tx) => {
    const normalizedName = normalizeCategoryNameForUniqueness(input.name)
    const exists = await categoryNameExists(normalizedName, id, tx)

    if (exists) {
      throw new CategoryExecutionError({
        code: "CATEGORY_NAME_CONFLICT",
        message: "Category name must be unique",
        status: 409,
        field: "name",
      })
    }

    try {
      await updateCategoryRecord(id, input, tx)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new CategoryExecutionError({
          code: "CATEGORY_NAME_CONFLICT",
          message: "Category name must be unique",
          status: 409,
          field: "name",
        })
      }

      throw error
    }

    return getCategoryById(id, tx)
  })
}
