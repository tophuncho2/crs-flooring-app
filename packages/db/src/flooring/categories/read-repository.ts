import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"

type CategoryDbClient = PrismaClient | Prisma.TransactionClient

// --- Unit include helpers ---

const categoryUnitInclude = {
  sendUnit: { select: { id: true, name: true } },
  stockUnit: { select: { id: true, name: true } },
  coverageAvailableUnit: { select: { id: true, name: true } },
  itemCoverageUnit: { select: { id: true, name: true } },
  serviceUnit: { select: { id: true, name: true } },
} as const

export const categoryInclude = {
  ...categoryUnitInclude,
  _count: {
    select: { products: true },
  },
} as const

type UnitRef = { id: string; name: string } | null

type CategoryUnitRefs = {
  sendUnit: UnitRef
  stockUnit: UnitRef
  coverageAvailableUnit: UnitRef
  itemCoverageUnit: UnitRef
  serviceUnit: UnitRef
}

function normalizeCategoryUnitValues(category: CategoryUnitRefs) {
  return {
    sendUnitId: category.sendUnit?.id ?? "",
    stockUnitId: category.stockUnit?.id ?? "",
    coverageAvailableUnitId: category.coverageAvailableUnit?.id ?? "",
    itemCoverageUnitId: category.itemCoverageUnit?.id ?? "",
    serviceUnitId: category.serviceUnit?.id ?? "",
    sendUnit: category.sendUnit?.name ?? "",
    stockUnit: category.stockUnit?.name ?? "",
    coverageAvailableUnit: category.coverageAvailableUnit?.name ?? "",
    itemCoverageUnit: category.itemCoverageUnit?.name ?? "",
    serviceUnit: category.serviceUnit?.name ?? "",
  }
}

// --- Types ---

export type CategoryRecord = {
  id: string
  name: string
  sendUnitId: string
  stockUnitId: string
  coverageAvailableUnitId: string
  itemCoverageUnitId: string
  serviceUnitId: string
  sendUnit: string
  stockUnit: string
  coverageAvailableUnit: string
  itemCoverageUnit: string
  serviceUnit: string
  productCount: number
  createdAt: string
  updatedAt: string
}

export type UnitOfMeasureOption = {
  id: string
  name: string
  createdAt: string
}

// --- Normalizers ---

export function normalizeCategoryRow(category: {
  id: string
  name: string
  sendUnit: UnitRef
  stockUnit: UnitRef
  coverageAvailableUnit: UnitRef
  itemCoverageUnit: UnitRef
  serviceUnit: UnitRef
  createdAt: Date
  updatedAt: Date
  _count?: { products: number }
}): CategoryRecord {
  return {
    id: category.id,
    name: category.name,
    ...normalizeCategoryUnitValues(category),
    productCount: category._count?.products ?? 0,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
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

export async function getCategoryById(id: string, client: CategoryDbClient = db): Promise<CategoryRecord> {
  const category = await client.flooringCategory.findUniqueOrThrow({
    where: { id },
    include: categoryInclude,
  })

  return normalizeCategoryRow(category)
}

export type CategoryDeleteStateResult = {
  productLinks: number
}

export async function getCategoryDeleteState(
  id: string,
  client: CategoryDbClient = db,
): Promise<CategoryDeleteStateResult | null> {
  const row = await client.flooringCategory.findUnique({
    where: { id },
    select: {
      _count: {
        select: { products: true },
      },
    },
  })

  if (!row) return null

  return {
    productLinks: row._count.products,
  }
}

export async function categoryNameExists(
  normalizedName: string,
  currentId?: string,
  client: CategoryDbClient = db,
): Promise<boolean> {
  const existing = await client.flooringCategory.findFirst({
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
