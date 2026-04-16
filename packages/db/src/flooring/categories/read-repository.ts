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

export const categoryInclude = categoryUnitInclude

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
  slug: string
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
}

// --- Normalizers ---

export function normalizeCategoryRow(category: {
  id: string
  slug: string
  name: string
  sendUnit: UnitRef
  stockUnit: UnitRef
  coverageAvailableUnit: UnitRef
  itemCoverageUnit: UnitRef
  serviceUnit: UnitRef
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
