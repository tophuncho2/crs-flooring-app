import {
  withPrismaConnectivityHandling,
} from "../../errors.js"
import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"

type UnitOfMeasureDbClient = PrismaClient | Prisma.TransactionClient

type UnitOfMeasureDbRow = {
  id: string
  slug: string
  name: string
  abbreviation: string
  createdAt: Date
  updatedAt: Date
}

export type UnitOfMeasureRecord = {
  id: string
  slug: string
  name: string
  abbreviation: string
  createdAt: string
  updatedAt: string
}

export function normalizeUnitOfMeasureRow(unit: UnitOfMeasureDbRow): UnitOfMeasureRecord {
  return {
    id: unit.id,
    slug: unit.slug,
    name: unit.name,
    abbreviation: unit.abbreviation,
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

export async function getUnitOfMeasuresPageData(
  client: UnitOfMeasureDbClient = db,
) {
  return withPrismaConnectivityHandling(() => listUnitOfMeasures(client))
}
