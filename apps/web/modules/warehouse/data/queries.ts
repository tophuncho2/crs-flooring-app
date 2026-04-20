import { createPrismaPageLoadIssue, isPrismaNotFoundError, prisma, withPrismaConnectivityHandling, type PrismaDetailPageResult } from "@builders/db"
import { withLoaderTiming } from "@/modules/shared/engines/common/application/loader-timing"
import { getWarehouseDetailRow } from "./api"
import type { WarehouseDetail, WarehouseRow } from "../types"

async function loadWarehouseRows() {
  const warehouses = await prisma.flooringWarehouse.findMany({
    include: {
      _count: {
        select: {
          sections: true,
          locations: true,
          workOrders: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return warehouses.map(
    (warehouse): WarehouseRow => ({
      id: warehouse.id,
      name: warehouse.name,
      address: warehouse.address,
      phone: warehouse.phone,
      sectionsCount: warehouse._count.sections,
      locationsCount: warehouse._count.locations,
      workOrdersCount: warehouse._count.workOrders,
      createdAt: warehouse.createdAt.toISOString(),
      updatedAt: warehouse.updatedAt.toISOString(),
    }),
  )
}

export async function getWarehousePageData() {
  return withPrismaConnectivityHandling(() =>
    withLoaderTiming(
      {
        loader: "flooring.warehouse.list",
      },
      () => loadWarehouseRows(),
    ),
  )
}

export async function getWarehouseById(id: string): Promise<WarehouseDetail> {
  return getWarehouseDetailRow(id)
}

export async function getWarehouseDetailPageData(id: string): Promise<PrismaDetailPageResult<Awaited<ReturnType<typeof getWarehouseById>>>> {
  try {
    return {
      ok: true,
      data: await withLoaderTiming(
        {
          loader: "flooring.warehouse.detail",
          details: { warehouseId: id },
        },
        () => getWarehouseById(id),
      ),
    }
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
        detail: "The warehouse record or its linked sections and locations could not be loaded.",
      }),
    }
  }
}
