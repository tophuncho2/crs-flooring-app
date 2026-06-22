import {
  createPrismaPageLoadIssue,
  getWarehouseDetailById,
  getWarehouseStats,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { WarehouseRow, WarehouseStats } from "@builders/domain"

export type WarehouseDetailPageData = {
  warehouse: WarehouseRow
  previousWarehouseId: string | null
  nextWarehouseId: string | null
  stats: WarehouseStats
}

export async function getWarehouseDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<WarehouseDetailPageData>> {
  try {
    const detail = await getWarehouseDetailById(id, { withNeighbors: true })
    if (!detail) {
      return { ok: false, notFound: true }
    }
    const { previousWarehouse, nextWarehouse, ...warehouse } = detail
    const stats = (await getWarehouseStats(id)) ?? {
      templatesCount: 0,
      workOrdersCount: 0,
      importsCount: 0,
    }
    return {
      ok: true,
      data: {
        warehouse,
        previousWarehouseId: previousWarehouse?.id ?? null,
        nextWarehouseId: nextWarehouse?.id ?? null,
        stats,
      },
    }
  } catch (error) {
    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "WAREHOUSE_DETAIL_LOAD_FAILED",
        title: "Warehouse Unavailable",
        message: "The app could not load this warehouse.",
        detail: "The warehouse record could not be loaded.",
      }),
    }
  }
}
