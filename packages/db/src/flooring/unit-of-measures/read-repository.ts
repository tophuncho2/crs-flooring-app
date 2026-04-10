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

