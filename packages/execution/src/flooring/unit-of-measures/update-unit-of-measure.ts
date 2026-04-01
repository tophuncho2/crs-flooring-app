import { Prisma } from "@builders/db"
import {
  getUnitOfMeasureById,
  unitOfMeasureNameExists,
  updateUnitOfMeasureRecord,
} from "@builders/db"
import { UnitOfMeasureExecutionError } from "./errors.js"

function normalizeNameForUniqueness(value: string): string {
  return value.trim().toLowerCase()
}

export async function updateUnitOfMeasureUseCase(id: string, input: { name: string }) {
  const normalizedName = normalizeNameForUniqueness(input.name)
  const exists = await unitOfMeasureNameExists(normalizedName, id)

  if (exists) {
    throw new UnitOfMeasureExecutionError({
      code: "UOM_NAME_CONFLICT",
      message: "Unit of measure must be unique",
      status: 409,
      field: "name",
    })
  }

  try {
    await updateUnitOfMeasureRecord(id, { name: input.name })
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

  return getUnitOfMeasureById(id)
}
