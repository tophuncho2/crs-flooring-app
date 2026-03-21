import { prisma } from "@/server/db/prisma"
import { withPrismaConnectivityHandling } from "@/server/db/prisma-errors"
import {
  flooringCategoryUnitInclude,
  normalizeCategoryUnitValues,
  normalizeUnitOfMeasureOption,
} from "@/server/flooring/unit-measures"

export type CategoryPageRow = {
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
}

async function loadCategoriesPageData() {
  const [categories, unitOfMeasures] = await Promise.all([
    prisma.flooringCategory.findMany({
      include: {
        ...flooringCategoryUnitInclude,
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.flooringUnitOfMeasure.findMany({
      orderBy: { name: "asc" },
    }),
  ])

  return {
    initialCategories: categories.map(
      (category): CategoryPageRow => ({
        id: category.id,
        name: category.name,
        ...normalizeCategoryUnitValues(category),
        productCount: category._count.products,
        createdAt: category.createdAt.toISOString(),
      }),
    ),
    unitOfMeasureOptions: unitOfMeasures.map(normalizeUnitOfMeasureOption),
  }
}

export async function getCategoriesPageData() {
  return withPrismaConnectivityHandling(() => loadCategoriesPageData())
}
