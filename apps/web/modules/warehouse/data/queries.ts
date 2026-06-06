import {
  createPrismaPageLoadIssue,
  getWarehouseById,
  type PrismaDetailPageResult,
} from "@builders/db"
import type { WarehouseRow } from "@builders/domain"

export type WarehouseDetailPageData = {
  warehouse: WarehouseRow
}

export async function getWarehouseDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<WarehouseDetailPageData>> {
  try {
    const warehouse = await getWarehouseById(id)
    if (!warehouse) {
      return { ok: false, notFound: true }
    }
    return { ok: true, data: { warehouse } }
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
