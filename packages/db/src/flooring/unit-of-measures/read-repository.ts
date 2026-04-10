import {
  withPrismaConnectivityHandling,
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

export async function getUnitOfMeasuresPageData(
  client: UnitOfMeasureDbClient = db,
) {
  return withPrismaConnectivityHandling(() => listUnitOfMeasures(client))
}
