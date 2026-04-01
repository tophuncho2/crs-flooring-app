import {
  createPrismaPageLoadIssue,
  isPrismaNotFoundError,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
} from "../../errors.js"
import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"

type UnitOfMeasureDbClient = PrismaClient | Prisma.TransactionClient

type UnitOfMeasureDbRow = {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export type UnitOfMeasureRecord = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export function normalizeUnitOfMeasureRow(unit: UnitOfMeasureDbRow): UnitOfMeasureRecord {
  return {
    id: unit.id,
    name: unit.name,
    createdAt: unit.createdAt.toISOString(),
    updatedAt: unit.updatedAt.toISOString(),
  }
}

export async function listUnitOfMeasures(client: UnitOfMeasureDbClient = db): Promise<UnitOfMeasureRecord[]> {
  const rows = await client.flooringUnitOfMeasure.findMany({
    orderBy: { name: "asc" },
  })

  return rows.map(normalizeUnitOfMeasureRow)
}

export async function getUnitOfMeasureById(
  id: string,
  client: UnitOfMeasureDbClient = db,
): Promise<UnitOfMeasureRecord> {
  const row = await client.flooringUnitOfMeasure.findUniqueOrThrow({
    where: { id },
  })

  return normalizeUnitOfMeasureRow(row)
}

export async function getUnitOfMeasuresPageData(
  client: UnitOfMeasureDbClient = db,
) {
  return withPrismaConnectivityHandling(() => listUnitOfMeasures(client))
}

export async function getUnitOfMeasureDetailPageData(
  id: string,
  client: UnitOfMeasureDbClient = db,
): Promise<PrismaDetailPageResult<UnitOfMeasureRecord>> {
  try {
    const record = await getUnitOfMeasureById(id, client)
    return { ok: true, data: record }
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

export async function unitOfMeasureNameExists(
  normalizedName: string,
  currentId?: string,
  client: UnitOfMeasureDbClient = db,
): Promise<boolean> {
  const existing = await client.flooringUnitOfMeasure.findFirst({
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

export type UnitOfMeasureDeleteStateResult = {
  categoryLinks: number
  serviceLinks: number
}

export async function getUnitOfMeasureDeleteState(
  id: string,
  client: UnitOfMeasureDbClient = db,
): Promise<UnitOfMeasureDeleteStateResult | null> {
  const row = await client.flooringUnitOfMeasure.findUnique({
    where: { id },
    select: {
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

  if (!row) return null

  return {
    categoryLinks:
      row._count.sendUnitCategories +
      row._count.stockUnitCategories +
      row._count.coverageAvailableUnitCategories +
      row._count.itemCoverageUnitCategories +
      row._count.serviceUnitCategories,
    serviceLinks:
      row._count.services +
      row._count.templateServiceItems +
      row._count.workOrderServiceItems,
  }
}
