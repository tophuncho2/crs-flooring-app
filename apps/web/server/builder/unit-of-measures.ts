import type { DataAccessContext } from "@/server/db/context"
import { prisma } from "@/server/db/prisma"
import { normalizeUnitOfMeasureOption } from "@/server/flooring/unit-measures"
import { createAppError, parseRequiredString } from "@/server/http/api-helpers"

export function normalizeUnitOfMeasureInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw createAppError("Invalid request body")
  }

  return {
    name: parseRequiredString((body as Record<string, unknown>).name, "name"),
  }
}

export async function listUnitOfMeasures(db: DataAccessContext = prisma) {
  const unitOfMeasures = await db.flooringUnitOfMeasure.findMany({
    orderBy: { name: "asc" },
  })

  return unitOfMeasures.map(normalizeUnitOfMeasureOption)
}

export async function createUnitOfMeasure(name: string, db: DataAccessContext = prisma) {
  const unitOfMeasure = await db.flooringUnitOfMeasure.create({
    data: { name },
  })

  return normalizeUnitOfMeasureOption(unitOfMeasure)
}

export async function updateUnitOfMeasure(id: string, name: string, db: DataAccessContext = prisma) {
  const unitOfMeasure = await db.flooringUnitOfMeasure.update({
    where: { id },
    data: { name },
  })

  return normalizeUnitOfMeasureOption(unitOfMeasure)
}

export async function deleteUnitOfMeasure(id: string, db: DataAccessContext = prisma) {
  const unitOfMeasure = await db.flooringUnitOfMeasure.findUnique({
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

  if (!unitOfMeasure) {
    throw createAppError("Unit of measure not found", { status: 404 })
  }

  const categoryLinks =
    unitOfMeasure._count.sendUnitCategories +
    unitOfMeasure._count.stockUnitCategories +
    unitOfMeasure._count.coverageAvailableUnitCategories +
    unitOfMeasure._count.itemCoverageUnitCategories +
    unitOfMeasure._count.serviceUnitCategories

  if (categoryLinks > 0) {
    throw createAppError("This unit of measure is linked to categories and cannot be deleted", { status: 409 })
  }

  if (
    unitOfMeasure._count.services > 0 ||
    unitOfMeasure._count.templateServiceItems > 0 ||
    unitOfMeasure._count.workOrderServiceItems > 0
  ) {
    throw createAppError("This unit of measure is linked and cannot be deleted", { status: 409 })
  }

  await db.flooringUnitOfMeasure.delete({ where: { id } })
}
