import { prisma } from "@/server/db/prisma"
import { withPrismaConnectivityHandling } from "@/server/db/prisma-errors"
import type { WarehouseRow } from "@/features/flooring/warehouse/components/warehouse-client"

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
  return withPrismaConnectivityHandling(() => loadWarehouseRows())
}
