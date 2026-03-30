import { prisma } from "@builders/db"
import { normalizeUnitOfMeasureOption } from "@/server/flooring/unit-measures"
import type { UnitOfMeasureForm } from "../domain/types"

export async function unitOfMeasureNameExists(normalizedName: string, currentId?: string) {
  const existing = await prisma.flooringUnitOfMeasure.findFirst({
    where: {
      name: {
        equals: normalizedName,
        mode: "insensitive",
      },
      ...(currentId ? { NOT: { id: currentId } } : {}),
    },
    select: { id: true },
  })

  return Boolean(existing)
}

export async function getUnitOfMeasureDeleteState(id: string) {
  return prisma.flooringUnitOfMeasure.findUnique({
    where: { id },
    select: {
      id: true,
      _count: {
        select: {
          sendUnitCategories: true,
          stockUnitCategories: true,
          coverageAvailableUnitCategories: true,
          itemCoverageUnitCategories: true,
          serviceUnitCategories: true,
          services: true,
          templateServiceItems: true,
          workOrderServiceItems: true,
        },
      },
    },
  })
}

export async function updateUnitOfMeasurePrimaryRecord(id: string, input: UnitOfMeasureForm) {
  await prisma.flooringUnitOfMeasure.update({
    where: { id },
    data: {
      name: input.name.trim(),
    },
  })
}

export async function createUnitOfMeasurePrimaryRecord(input: UnitOfMeasureForm) {
  const unitOfMeasure = await prisma.flooringUnitOfMeasure.create({
    data: {
      name: input.name.trim(),
    },
  })

  return normalizeUnitOfMeasureOption(unitOfMeasure)
}

export async function deleteUnitOfMeasureRecordById(id: string) {
  await prisma.flooringUnitOfMeasure.delete({
    where: { id },
  })
}
