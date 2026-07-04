import {
  createPrismaPageLoadIssue,
  getUnitOfMeasureDetailById,
  getUnitOfMeasureStats,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { UnitOfMeasure, UnitOfMeasureStats } from "@builders/domain"

export type UnitOfMeasureDetailPageData = {
  unitOfMeasure: UnitOfMeasure
  stats: UnitOfMeasureStats
}

// Read-only detail loader. UoM is a seed-sourced reference table (no CRUD), so
// this is a plain point read + usage counts — no neighbors (no stepper).
export async function getUnitOfMeasureDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<UnitOfMeasureDetailPageData>> {
  try {
    const unitOfMeasure = await getUnitOfMeasureDetailById(id)
    if (!unitOfMeasure) {
      return { ok: false, notFound: true }
    }
    const stats = (await getUnitOfMeasureStats(id)) ?? {
      productsCount: 0,
      inventoriesCount: 0,
      totalUsage: 0,
    }
    return { ok: true, data: { unitOfMeasure, stats } }
  } catch (error) {
    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "UNIT_OF_MEASURE_DETAIL_LOAD_FAILED",
        title: "Unit of Measure Unavailable",
        message: "The app could not load this unit of measure.",
        detail: "The unit of measure record could not be loaded.",
      }),
    }
  }
}
