import { prisma } from "@builders/db"
import {
  createPrismaPageLoadIssue,
  isPrismaNotFoundError,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
} from "@builders/db"
import { parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import {
  flooringCategoryUnitInclude,
  normalizeCategoryUnitValues,
  normalizeUnitOfMeasureOption,
} from "@/server/flooring/unit-measures"
import type { CategoryRow, UnitOfMeasureOption } from "../domain/types"

const categoryInclude = {
  ...flooringCategoryUnitInclude,
  _count: {
    select: { products: true },
  },
} as const

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

export async function listCategories(): Promise<CategoryRow[]> {
  const categories = await prisma.flooringCategory.findMany({
    include: categoryInclude,
    orderBy: { name: "asc" },
  })

  return categories.map(normalizeCategory)
}

export async function createCategory(body: Record<string, unknown>): Promise<CategoryRow> {
  const category = await prisma.flooringCategory.create({
    data: {
      name: parseRequiredString(body.name, "name"),
      sendUnitId: parseOptionalString(body.sendUnitId),
      stockUnitId: parseOptionalString(body.stockUnitId),
      coverageAvailableUnitId: parseOptionalString(body.coverageAvailableUnitId),
      itemCoverageUnitId: parseOptionalString(body.itemCoverageUnitId),
      serviceUnitId: parseOptionalString(body.serviceUnitId),
    },
    include: categoryInclude,
  })

  return normalizeCategory(category)
}

export async function updateCategory(id: string, body: Record<string, unknown>): Promise<CategoryRow> {
  const category = await prisma.flooringCategory.update({
    where: { id },
    data: {
      name: parseRequiredString(body.name, "name"),
      sendUnitId: parseOptionalString(body.sendUnitId),
      stockUnitId: parseOptionalString(body.stockUnitId),
      coverageAvailableUnitId: parseOptionalString(body.coverageAvailableUnitId),
      itemCoverageUnitId: parseOptionalString(body.itemCoverageUnitId),
      serviceUnitId: parseOptionalString(body.serviceUnitId),
    },
    include: categoryInclude,
  })

  return normalizeCategory(category)
}

export async function deleteCategory(id: string) {
  await prisma.flooringCategory.delete({ where: { id } })
  return { success: true } as const
}

async function loadUnitOptions(): Promise<UnitOfMeasureOption[]> {
  const unitOfMeasures = await prisma.flooringUnitOfMeasure.findMany({
    orderBy: { name: "asc" },
  })

  return unitOfMeasures.map(normalizeUnitOfMeasureOption)
}

export async function getCategoriesPageData() {
  return withPrismaConnectivityHandling(async () => ({
    initialCategories: await listCategories(),
    unitOfMeasureOptions: await loadUnitOptions(),
  }))
}

export async function getCategoryById(id: string): Promise<CategoryRow> {
  const category = await prisma.flooringCategory.findUniqueOrThrow({
    where: { id },
    include: categoryInclude,
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
