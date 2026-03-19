import { prisma } from "@/server/db/prisma"
import { requireToolAccess } from "@/server/auth/session"
import WarehouseClient, { type WarehouseRow } from "@/features/flooring/warehouse/components/warehouse-client"

type WarehouseQueryRow = {
  id: string
  name: string
  address: string | null
  phone: string | null
  createdAt: Date
  updatedAt: Date
  _count: {
    locations: number
    workOrders: number
  }
}

export default async function FlooringWarehousePage() {
  await requireToolAccess("warehouse")

  let warehouses: WarehouseQueryRow[] = []
  try {
    const fetched = await prisma.flooringWarehouse.findMany({
      include: {
        _count: {
          select: {
            locations: true,
            workOrders: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    warehouses = fetched as WarehouseQueryRow[]
  } catch {
    warehouses = []
  }

  const rows: WarehouseRow[] = warehouses.map((warehouse) => ({
    id: warehouse.id,
    name: warehouse.name,
    address: warehouse.address,
    phone: warehouse.phone,
    sectionsCount: 0,
    locationsCount: warehouse._count.locations,
    workOrdersCount: warehouse._count.workOrders,
    createdAt: warehouse.createdAt.toISOString(),
    updatedAt: warehouse.updatedAt.toISOString(),
  }))

  return <WarehouseClient initialRows={rows} />
}
