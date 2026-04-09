import {
  withPrismaConnectivityHandling,
  isPrismaNotFoundError,
  createPrismaPageLoadIssue,
  listCategories,
  getCategoryById,
  getCategoryDeleteState,
  categoryNameExists,
  listUnitOfMeasures,
  type PrismaDetailPageResult,
  type CategoryRecord,
} from "@builders/db"

export type { CategoryRecord }

export type UnitOfMeasureOption = {
  id: string
  name: string
  createdAt: string
}

function toUnitOfMeasureOption(record: { id: string; name: string; createdAt: string }): UnitOfMeasureOption {
  return { id: record.id, name: record.name, createdAt: record.createdAt }
}

async function loadUnitOfMeasureOptions(): Promise<UnitOfMeasureOption[]> {
  const records = await listUnitOfMeasures()
  return records.map(toUnitOfMeasureOption)
}

export {
  listCategories,
  getCategoryById,
  getCategoryDeleteState,
  categoryNameExists,
}

export async function getCategoriesPageData() {
  return withPrismaConnectivityHandling(async () => ({
    initialCategories: await listCategories(),
    unitOfMeasureOptions: await loadUnitOfMeasureOptions(),
  }))
}

export async function getCategoryCreatePageData() {
  return withPrismaConnectivityHandling(async () => ({
    unitOfMeasureOptions: await loadUnitOfMeasureOptions(),
  }))
}

export async function getCategoryDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<{
  category: CategoryRecord
  unitOfMeasureOptions: UnitOfMeasureOption[]
}>> {
  try {
    const [category, unitOfMeasureOptions] = await Promise.all([
      getCategoryById(id),
      loadUnitOfMeasureOptions(),
    ])

    return {
      ok: true,
      data: { category, unitOfMeasureOptions },
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
