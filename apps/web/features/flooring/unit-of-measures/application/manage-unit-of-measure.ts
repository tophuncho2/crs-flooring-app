import { prisma } from "@builders/db"
import { createAppError } from "@/server/http/api-helpers"
import {
  deleteUnitOfMeasure,
  normalizeUnitOfMeasureInput,
  updateUnitOfMeasure,
  createUnitOfMeasure,
} from "@/server/builder/unit-of-measures"
import { normalizeUnitOfMeasureName, validateUnitOfMeasureForm, type UnitOfMeasureForm } from "../domain/types"

async function assertUnitOfMeasureNameAvailable(name: string, currentId?: string) {
  const existing = await prisma.flooringUnitOfMeasure.findFirst({
    where: {
      name: {
        equals: name,
        mode: "insensitive",
      },
      ...(currentId ? { NOT: { id: currentId } } : {}),
    },
    select: { id: true },
  })

  if (existing) {
    throw createAppError("Unit of measure must be unique", {
      status: 409,
      field: "name",
    })
  }
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
  await assertUnitOfMeasureNameAvailable(normalizeUnitOfMeasureName(input.name).toLowerCase())
  return createUnitOfMeasure(input.name.trim())
}

export async function replaceUnitOfMeasurePrimarySection(id: string, input: UnitOfMeasureForm) {
  await assertUnitOfMeasureNameAvailable(normalizeUnitOfMeasureName(input.name).toLowerCase(), id)
  return updateUnitOfMeasure(id, input.name.trim())
}

export async function deleteUnitOfMeasureRecord(id: string) {
  return deleteUnitOfMeasure(id)
}
