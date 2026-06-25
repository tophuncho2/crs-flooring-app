import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeUnitOfMeasureListRow,
  type UnitOfMeasureListRow,
} from "@builders/domain"

type UnitOfMeasureDbClient = PrismaClient | Prisma.TransactionClient

// --- List view (counted pagination) ---

export type UnitOfMeasureListViewOptions = {
  skip: number
  take: number
}

export type UnitOfMeasureListViewResult = {
  rows: UnitOfMeasureListRow[]
  total: number
}

// Read-only units list — no search/filter (the surface is a bare data table).
// Counted pagination: count + page fetch in parallel, mirroring the users read.
export async function listUnitOfMeasuresForListView(
  options: UnitOfMeasureListViewOptions,
  client: UnitOfMeasureDbClient = db,
): Promise<UnitOfMeasureListViewResult> {
  const [total, rows] = await Promise.all([
    client.flooringUnitOfMeasure.count(),
    client.flooringUnitOfMeasure.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: options.skip,
      take: options.take,
      select: {
        id: true,
        name: true,
        abbreviation: true,
        createdAt: true,
      },
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeUnitOfMeasureListRow),
  }
}
