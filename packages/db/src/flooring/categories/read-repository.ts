import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeCategoryListRow,
  type CategoryListRow,
  type CategoryOption,
} from "@builders/domain"

type CategoryDbClient = PrismaClient | Prisma.TransactionClient

// --- Unit include helpers ---

const categoryUnitInclude = {
  sendUnit: { select: { id: true, name: true, abbreviation: true } },
  stockUnit: { select: { id: true, name: true, abbreviation: true } },
} as const

export const categoryInclude = categoryUnitInclude

type UnitRef = { id: string; name: string; abbreviation: string } | null

type CategoryUnitRefs = {
  sendUnit: UnitRef
  stockUnit: UnitRef
}

function normalizeCategoryUnitValues(category: CategoryUnitRefs) {
  return {
    sendUnitId: category.sendUnit?.id ?? "",
    stockUnitId: category.stockUnit?.id ?? "",
    sendUnit: category.sendUnit?.name ?? "",
    stockUnit: category.stockUnit?.name ?? "",
    sendUnitAbbrev: category.sendUnit?.abbreviation ?? "",
    stockUnitAbbrev: category.stockUnit?.abbreviation ?? "",
  }
}

// --- Types ---

export type CategoryRecord = {
  id: string
  slug: string
  name: string
  sendUnitId: string
  stockUnitId: string
  sendUnit: string
  stockUnit: string
  sendUnitAbbrev: string
  stockUnitAbbrev: string
}

// --- Normalizers ---

export function normalizeCategoryRow(category: {
  id: string
  slug: string
  name: string
  sendUnit: UnitRef
  stockUnit: UnitRef
}): CategoryRecord {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    ...normalizeCategoryUnitValues(category),
  }
}

// --- Read functions ---

export async function listCategories(client: CategoryDbClient = db): Promise<CategoryRecord[]> {
  const categories = await client.flooringCategory.findMany({
    include: categoryInclude,
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
    include: categoryInclude,
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
      include: categoryInclude,
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
    select: { id: true, name: true, slug: true },
  })

  const hasMore = rows.length > args.take
  const page = hasMore ? rows.slice(0, args.take) : rows
  return {
    items: page.map((row) => ({ id: row.id, name: row.name, slug: row.slug })),
    hasMore,
  }
}
