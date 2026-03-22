import { prisma } from "@/server/db/prisma"
import {
  createPrismaPageLoadIssue,
  isPrismaNotFoundError,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
} from "@/server/db/prisma-errors"
import {
  flooringCategoryUnitInclude,
  normalizeCategoryUnitValues,
  normalizeUnitOfMeasureOption,
} from "@/server/flooring/unit-measures"
import type { CategoryRow, UnitOfMeasureOption } from "../domain/types"

function normalizeCategory(category: {
  id: string
  name: string
  sendUnit: { id: string; name: string } | null
  stockUnit: { id: string; name: string } | null
  coverageAvailableUnit: { id: string; name: string } | null
  itemCoverageUnit: { id: string; name: string } | null
  serviceUnit: { id: string; name: string } | null
  createdAt: Date
  _count?: { products: number }
}): CategoryRow {
  return {
    id: category.id,
    name: category.name,
    ...normalizeCategoryUnitValues(category),
    productCount: category._count?.products ?? 0,
    createdAt: category.createdAt.toISOString(),
  }
}

async function loadCategoryRows() {
  const categories = await prisma.flooringCategory.findMany({
    include: {
      ...flooringCategoryUnitInclude,
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: "asc" },
  })

  return categories.map(normalizeCategory)
}

async function loadUnitOptions(): Promise<UnitOfMeasureOption[]> {
  const unitOfMeasures = await prisma.flooringUnitOfMeasure.findMany({
    orderBy: { name: "asc" },
  })

  return unitOfMeasures.map(normalizeUnitOfMeasureOption)
}

export async function getCategoriesPageData() {
  return withPrismaConnectivityHandling(async () => ({
    initialCategories: await loadCategoryRows(),
    unitOfMeasureOptions: await loadUnitOptions(),
  }))
}

export async function getCategoryById(id: string): Promise<CategoryRow> {
  const category = await prisma.flooringCategory.findUniqueOrThrow({
    where: { id },
    include: {
      ...flooringCategoryUnitInclude,
      _count: {
        select: { products: true },
      },
    },
  })

  return normalizeCategory(category)
}

export async function getCategoryDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  category: CategoryRow
  unitOfMeasureOptions: UnitOfMeasureOption[]
}>> {
  try {
    const [category, unitOfMeasureOptions] = await Promise.all([
      getCategoryById(id),
      loadUnitOptions(),
    ])

    return {
      ok: true,
      data: {
        category,
        unitOfMeasureOptions,
      },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "CATEGORY_DETAIL_LOAD_FAILED",
        title: "Category Unavailable",
        message: "The app could not load this category.",
        detail: "The category record could not be loaded.",
      }),
    }
  }
}
