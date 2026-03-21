import { prisma } from "@/server/db/prisma"
import { withPrismaConnectivityHandling } from "@/server/db/prisma-errors"
import { normalizeUnitOfMeasureOption } from "@/server/flooring/unit-measures"

async function loadUnitOfMeasureOptions() {
  const unitOfMeasures = await prisma.flooringUnitOfMeasure.findMany({
    orderBy: { name: "asc" },
  })

  return unitOfMeasures.map(normalizeUnitOfMeasureOption)
}

export async function listUnitOfMeasureOptions() {
  return loadUnitOfMeasureOptions()
}

export async function getUnitOfMeasuresPageData() {
  return withPrismaConnectivityHandling(() => loadUnitOfMeasureOptions())
}
