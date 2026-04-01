import {
  Prisma,
  categoryNameExists,
  createCategoryRecord,
  withDatabaseTransaction,
} from "@builders/db"
import { normalizeCategoryNameForUniqueness } from "@builders/domain"
import { CategoryExecutionError } from "./errors.js"

export type CategoryFormInput = {
  name: string
  sendUnitId: string
  stockUnitId: string
  coverageAvailableUnitId: string
  itemCoverageUnitId: string
  serviceUnitId: string
}

export async function createCategoryUseCase(input: CategoryFormInput) {
  return withDatabaseTransaction(async (tx) => {
    const normalizedName = normalizeCategoryNameForUniqueness(input.name)
    const exists = await categoryNameExists(normalizedName, undefined, tx)

    if (exists) {
      throw new CategoryExecutionError({
        code: "CATEGORY_NAME_CONFLICT",
        message: "Category name must be unique",
        status: 409,
        field: "name",
      })
    }

    try {
      return await createCategoryRecord(input, tx)
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
  })
}
