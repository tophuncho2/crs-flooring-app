import { db } from "../client.js"
import { sliceHasMore } from "../shared/paginate.js"
import type { Prisma, PrismaClient } from "../generated/prisma/client.js"
import type { ConversionFormulaOption } from "@builders/domain"

type ConversionFormulaDbClient = PrismaClient | Prisma.TransactionClient

// --- Picker options (infinite-scroll search) ---

export type ConversionFormulaOptionsSearchArgs = {
  search?: string
  skip?: number
  take: number
}

export type ConversionFormulaOptionsSearchResult = {
  items: ConversionFormulaOption[]
  hasMore: boolean
}

/**
 * Read-only formula lookup for the product-form + row conversion pickers. The
 * table is migration-seeded (no CRUD), so this is search + paginate only,
 * mirroring `searchUnitOfMeasureOptions`. Matches on the formula `name`.
 */
export async function searchConversionFormulaOptions(
  args: ConversionFormulaOptionsSearchArgs,
  client: ConversionFormulaDbClient = db,
): Promise<ConversionFormulaOptionsSearchResult> {
  const where = args.search
    ? { name: { contains: args.search, mode: "insensitive" as const } }
    : undefined

  const skip = Math.max(0, Math.floor(args.skip ?? 0))
  const rows = await client.flooringConversionFormula.findMany({
    where,
    orderBy: { name: "asc" },
    skip,
    take: args.take + 1,
    select: { id: true, name: true },
  })

  const { page, hasMore } = sliceHasMore(rows, args.take)
  return {
    items: page.map((row) => ({ id: row.id, name: row.name })),
    hasMore,
  }
}
