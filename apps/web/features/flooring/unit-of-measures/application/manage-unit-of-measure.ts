import { Prisma } from "@builders/db"
import { createAppError } from "@/server/http/api-helpers"
import { normalizeUnitOfMeasureInput } from "@/server/builder/unit-of-measures"
import { getUnitOfMeasureById } from "../data/queries"
import {
  createUnitOfMeasurePrimaryRecord,
  deleteUnitOfMeasureRecordById,
  getUnitOfMeasureDeleteState,
  unitOfMeasureNameExists,
  updateUnitOfMeasurePrimaryRecord,
} from "../data/server-records"
import {
  isUnitOfMeasureDeleteBlocked,
  isUnitOfMeasureNameConflict,
  normalizeUnitOfMeasureNameForUniqueness,
} from "../domain/unit-of-measure-rules"
import { validateUnitOfMeasureForm, type UnitOfMeasureForm } from "../domain/types"

async function assertUnitOfMeasureNameAvailable(name: string, currentId?: string) {
  if (isUnitOfMeasureNameConflict(await unitOfMeasureNameExists(name, currentId))) {
    throw createAppError("Unit of measure must be unique", {
      status: 409,
      field: "name",
    })
  }
}

function mapUnitOfMeasureUniquenessError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw createAppError("Unit of measure must be unique", {
      status: 409,
      field: "name",
    })
  }

  throw error
}

export function validateUpdateUnitOfMeasurePrimarySectionInput(body: Record<string, unknown>) {
  const input = normalizeUnitOfMeasureInput(body)
  const validationError = validateUnitOfMeasureForm(input)
  if (validationError) {
    throw createAppError(validationError, { field: "name" })
  }

  return input
}

export async function createUnitOfMeasureRecord(input: UnitOfMeasureForm) {
  await assertUnitOfMeasureNameAvailable(normalizeUnitOfMeasureNameForUniqueness(input.name))
  try {
    return await createUnitOfMeasurePrimaryRecord(input)
  } catch (error) {
    mapUnitOfMeasureUniquenessError(error)
  }
}

export async function replaceUnitOfMeasurePrimarySection(id: string, input: UnitOfMeasureForm) {
  await assertUnitOfMeasureNameAvailable(normalizeUnitOfMeasureNameForUniqueness(input.name), id)
  try {
    await updateUnitOfMeasurePrimaryRecord(id, input)
    return getUnitOfMeasureById(id)
  } catch (error) {
    mapUnitOfMeasureUniquenessError(error)
  }
}

export async function deleteUnitOfMeasureRecord(id: string) {
  const unitOfMeasure = await getUnitOfMeasureDeleteState(id)
  if (!unitOfMeasure) {
    throw createAppError("Unit of measure not found", { status: 404 })
  }

  const categoryLinks =
    unitOfMeasure._count.sendUnitCategories +
    unitOfMeasure._count.stockUnitCategories +
    unitOfMeasure._count.coverageAvailableUnitCategories +
    unitOfMeasure._count.itemCoverageUnitCategories +
    unitOfMeasure._count.serviceUnitCategories

  const serviceLinks =
    unitOfMeasure._count.services +
    unitOfMeasure._count.templateServiceItems +
    unitOfMeasure._count.workOrderServiceItems

  if (isUnitOfMeasureDeleteBlocked({ categoryLinks, serviceLinks })) {
    throw createAppError(
      categoryLinks > 0
        ? "This unit of measure is linked to categories and cannot be deleted"
        : "This unit of measure is linked and cannot be deleted",
      { status: 409 },
    )
  }

  await deleteUnitOfMeasureRecordById(id)
  return { ok: true as const }
}
