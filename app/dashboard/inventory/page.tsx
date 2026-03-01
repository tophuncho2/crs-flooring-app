import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import InventoryClient, { type InventoryRow } from "./inventory-client"

export default async function InventoryPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  })

  if (!user) redirect("/login")
  if (user.role !== "BUILDER" && user.role !== "ADMIN") redirect("/dashboard")

  const lots = await prisma.flooringInventoryLot.findMany({
    where: {
      OR: [{ importBatchId: null }, { importBatch: { status: "FINAL" } }],
    },
    include: {
      product: {
        select: {
          category: { select: { name: true } },
          manufacturer: true,
        },
      },
      warehouse: { select: { id: true, name: true } },
      location: { select: { id: true, locationCode: true } },
      importBatch: { select: { id: true, status: true } },
      _count: { select: { logs: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const rows: InventoryRow[] = lots.map((lot) => ({
    id: lot.id,
    productId: lot.productId,
    categoryName: lot.product?.category?.name ?? null,
    manufacturer: lot.product?.manufacturer ?? null,
    warehouseId: lot.warehouseId,
    warehouseName: lot.warehouse?.name ?? null,
    section: null,
    locationId: lot.locationId,
    locationCode: lot.location?.locationCode ?? null,
    itemNumber: lot.itemNumber,
    dyeLot: lot.dyeLot,
    stockCount: lot.stockCount.toString(),
    stockUnit: lot.stockUnit,
    cost: lot.cost?.toString() ?? null,
    freight: lot.freight?.toString() ?? null,
    importBatchId: lot.importBatchId,
    importStatus: lot.importBatch?.status ?? null,
    cutLogsCount: lot._count.logs,
    createdAt: lot.createdAt.toISOString(),
    updatedAt: lot.updatedAt.toISOString(),
  }))

  return <InventoryClient initialRows={rows} />
}
