import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isToolUnlocked } from "@/lib/tool-subscriptions"
import WarehouseClient, { type WarehouseRow } from "./warehouse-client"

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
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })

  if (!user) redirect("/login")
  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "warehouse" }))) redirect("/dashboard")

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
