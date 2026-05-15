import {
  listWarehouses,
  withPrismaConnectivityHandling,
  type PrismaPageDataResult,
  type WarehouseRecord,
} from "@builders/db"
import { withLoaderTiming } from "@/modules/shared/engines/common/application/loader-timing"

export async function getWarehousePageData(): Promise<PrismaPageDataResult<WarehouseRecord[]>> {
  return withPrismaConnectivityHandling(() =>
    withLoaderTiming({ loader: "flooring.warehouse.list" }, () => listWarehouses()),
  )
}
