import {
  Prisma,
  getUnitOfMeasureById,
  unitOfMeasureNameExists,
  updateUnitOfMeasureRecord,
  withDatabaseTransaction,
} from "@builders/db"
import { normalizeUnitOfMeasureNameForUniqueness } from "@builders/domain"
import { UnitOfMeasureExecutionError } from "./errors.js"

export async function updateUnitOfMeasureUseCase(id: string, input: { name: string }) {
  return withDatabaseTransaction(async (tx) => {
    const normalizedName = normalizeUnitOfMeasureNameForUniqueness(input.name)
    const exists = await unitOfMeasureNameExists(normalizedName, id, tx)

    if (exists) {
      throw new UnitOfMeasureExecutionError({
        code: "UOM_NAME_CONFLICT",
        message: "Unit of measure must be unique",
        status: 409,
        field: "name",
      })
    }

    try {
      await updateUnitOfMeasureRecord(id, { name: input.name }, tx)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new UnitOfMeasureExecutionError({
          code: "UOM_NAME_CONFLICT",
          message: "Unit of measure must be unique",
          status: 409,
          field: "name",
        })
      }

      throw error
    }

    return getUnitOfMeasureById(id, tx)
  })
}
