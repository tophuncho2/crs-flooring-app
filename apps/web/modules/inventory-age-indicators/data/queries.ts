import {
  createPrismaPageLoadIssue,
  getInventoryAgeIndicatorDetailById,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { InventoryAgeIndicator } from "@builders/domain"

export type InventoryAgeIndicatorDetailPageData = {
  inventoryAgeIndicator: InventoryAgeIndicator
  previousInventoryAgeIndicatorId: string | null
  nextInventoryAgeIndicatorId: string | null
}

export async function getInventoryAgeIndicatorDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<InventoryAgeIndicatorDetailPageData>> {
  try {
    const detail = await getInventoryAgeIndicatorDetailById(id, { withNeighbors: true })
    if (!detail) {
      return { ok: false, notFound: true }
    }
    const { previousInventoryAgeIndicator, nextInventoryAgeIndicator, ...inventoryAgeIndicator } =
      detail
    return {
      ok: true,
      data: {
        inventoryAgeIndicator,
        previousInventoryAgeIndicatorId: previousInventoryAgeIndicator?.id ?? null,
        nextInventoryAgeIndicatorId: nextInventoryAgeIndicator?.id ?? null,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "INVENTORY_AGE_INDICATOR_DETAIL_LOAD_FAILED",
        title: "Age Indicator Unavailable",
        message: "The app could not load this inventory age indicator.",
        detail: "The inventory age indicator record could not be loaded.",
      }),
    }
  }
}
