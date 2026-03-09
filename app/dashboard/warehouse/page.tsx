import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import WarehouseClient, { type WarehouseRow } from "./warehouse-client"
import { isToolUnlocked } from "@/lib/tool-subscriptions"

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

export default async function WarehousePage() {
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

  const rows: WarehouseRow[] = warehouses.map((w) => ({
    id: w.id,
    name: w.name,
    address: w.address,
    phone: w.phone,
    sectionsCount: 0,
    locationsCount: w._count.locations,
    workOrdersCount: w._count.workOrders,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  }))

  return <WarehouseClient initialRows={rows} />
}
