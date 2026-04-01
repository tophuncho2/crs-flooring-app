import {
  Prisma,
  createUnitOfMeasureRecord,
  unitOfMeasureNameExists,
  withDatabaseTransaction,
} from "@builders/db"
import { normalizeUnitOfMeasureNameForUniqueness } from "@builders/domain"
import { UnitOfMeasureExecutionError } from "./errors.js"

export async function createUnitOfMeasureUseCase(input: { name: string }) {
  return withDatabaseTransaction(async (tx) => {
    const normalizedName = normalizeUnitOfMeasureNameForUniqueness(input.name)
    const exists = await unitOfMeasureNameExists(normalizedName, undefined, tx)

    if (exists) {
      throw new UnitOfMeasureExecutionError({
        code: "UOM_NAME_CONFLICT",
        message: "Unit of measure must be unique",
        status: 409,
        field: "name",
      })
    }

    try {
      return await createUnitOfMeasureRecord({ name: input.name }, tx)
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
  })
}
