import { prisma } from "@builders/db"
import {
  createPrismaPageLoadIssue,
  isPrismaNotFoundError,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
} from "@builders/db"
import { normalizeUnitOfMeasureOption } from "@/server/flooring/unit-measures"
import type { UnitOfMeasureRow } from "../domain/types"

async function loadUnitOfMeasureRows() {
  const unitOfMeasures = await prisma.flooringUnitOfMeasure.findMany({
    orderBy: { name: "asc" },
  })

  return unitOfMeasures.map(normalizeUnitOfMeasureOption)
}

export async function listUnitOfMeasureOptions() {
  return loadUnitOfMeasureRows()
}

export async function getUnitOfMeasuresPageData() {
  return withPrismaConnectivityHandling(() => loadUnitOfMeasureRows())
}

export async function getUnitOfMeasureById(id: string): Promise<UnitOfMeasureRow> {
  const unitOfMeasure = await prisma.flooringUnitOfMeasure.findUniqueOrThrow({
    where: { id },
  })

  return normalizeUnitOfMeasureOption(unitOfMeasure)
}

export async function getUnitOfMeasureDetailPageData(id: string): Promise<PrismaDetailPageResult<UnitOfMeasureRow>> {
  try {
    const unitOfMeasure = await getUnitOfMeasureById(id)
    return {
      ok: true,
      data: unitOfMeasure,
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "UNIT_OF_MEASURE_DETAIL_LOAD_FAILED",
        title: "Unit Of Measure Unavailable",
        message: "The app could not load this unit of measure.",
        detail: "The unit of measure record could not be loaded.",
      }),
    }
  }
}
