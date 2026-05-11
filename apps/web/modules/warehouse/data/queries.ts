import {
  createPrismaPageLoadIssue,
  getWarehouseDetailById,
  isPrismaNotFoundError,
  listWarehouses,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
  type PrismaPageDataResult,
  type WarehouseDetailRecord,
  type WarehouseRecord,
} from "@builders/db"
import { withLoaderTiming } from "@/modules/shared/engines/common/application/loader-timing"

export async function getWarehousePageData(): Promise<PrismaPageDataResult<WarehouseRecord[]>> {
  return withPrismaConnectivityHandling(() =>
    withLoaderTiming({ loader: "flooring.warehouse.list" }, () => listWarehouses()),
  )
}

export async function getWarehouseDetailPageData(
  id: string,
): Promise<PrismaDetailPageResult<WarehouseDetailRecord>> {
  try {
    const warehouse = await withLoaderTiming(
      { loader: "flooring.warehouse.detail", details: { warehouseId: id } },
      () => getWarehouseDetailById(id),
    )
    if (!warehouse) return { ok: false, notFound: true }
    return { ok: true, data: warehouse }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }
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
