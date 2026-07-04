import {
  createPrismaPageLoadIssue,
  getCategoryDetailById,
  getCategoryStats,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { Category, CategoryStats } from "@builders/domain"

export type CategoryDetailPageData = {
  category: Category
  stats: CategoryStats
}

// Read-only detail loader. Category is a seed-sourced reference table (no CRUD),
// so this is a plain point read + usage count — no neighbors (no stepper).
export async function getCategoryDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<CategoryDetailPageData>> {
  try {
    const category = await getCategoryDetailById(id)
    if (!category) {
      return { ok: false, notFound: true }
    }
    const stats = (await getCategoryStats(id)) ?? { productsCount: 0 }
    return { ok: true, data: { category, stats } }
  } catch (error) {
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
