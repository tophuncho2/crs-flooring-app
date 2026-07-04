import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeCategoryListRow,
  type CategoryListRow,
  type CategoryOption,
} from "@builders/domain"

type CategoryDbClient = PrismaClient | Prisma.TransactionClient

// --- Types ---

export type CategoryRecord = {
  id: string
  name: string
}

// --- Normalizers ---

export function normalizeCategoryRow(category: {
  id: string
  name: string
}): CategoryRecord {
  return {
    id: category.id,
    name: category.name,
  }
}

// --- Read functions ---

export async function listCategories(client: CategoryDbClient = db): Promise<CategoryRecord[]> {
  const categories = await client.flooringCategory.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return categories.map(normalizeCategoryRow)
}

export async function getCategoryById(
  id: string,
  client: CategoryDbClient = db,
): Promise<CategoryRecord | null> {
  const category = await client.flooringCategory.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
  return category ? normalizeCategoryRow(category) : null
}

// --- List view (counted pagination) ---

export type CategoryListViewOptions = {
  skip: number
  take: number
}

export type CategoryListViewResult = {
  rows: CategoryListRow[]
  total: number
}

// Read-only categories list — no search/filter (the surface is a bare data
// table). Counted pagination: count + page fetch in parallel, mirroring the
// users read.
export async function listCategoriesForListView(
  options: CategoryListViewOptions,
  client: CategoryDbClient = db,
): Promise<CategoryListViewResult> {
  const [total, rows] = await Promise.all([
    client.flooringCategory.count(),
    client.flooringCategory.findMany({
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: options.skip,
      take: options.take,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeCategoryListRow),
  }
}

// --- Picker / options search ---

export type CategoryOptionsSearchArgs = {
  search?: string
  skip?: number
  take: number
}

export type CategoryOptionsSearchResult = {
  items: CategoryOption[]
  hasMore: boolean
}

export async function searchCategoryOptions(
  args: CategoryOptionsSearchArgs,
  client: CategoryDbClient = db,
): Promise<CategoryOptionsSearchResult> {
  const where = args.search
    ? { name: { contains: args.search, mode: "insensitive" as const } }
    : undefined

  // Fetch take+1 (offset by skip) to detect a next page without a count query.
  const skip = Math.max(0, Math.floor(args.skip ?? 0))
  const rows = await client.flooringCategory.findMany({
    where,
    orderBy: { name: "asc" },
    skip,
    take: args.take + 1,
    select: { id: true, name: true },
  })

  const hasMore = rows.length > args.take
  const page = hasMore ? rows.slice(0, args.take) : rows
  return {
    items: page.map((row) => ({ id: row.id, name: row.name })),
    hasMore,
  }
}
