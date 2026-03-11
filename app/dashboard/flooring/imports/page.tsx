import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { findFlooringLocationsForImports } from "@/lib/flooring-db-compat"
import { isToolUnlocked } from "@/lib/tool-subscriptions"
import ImportsClient from "./imports-client"

function buildProductLabel(product: {
  name: string
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return product.name || [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Flooring Product"
}

export default async function FlooringImportsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  })

  if (!user) redirect("/login")
  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug: "warehouse" }))) redirect("/dashboard")

  const [entries, products, warehouses, locations] = await Promise.all([
    prisma.flooringImportEntry.findMany({
      include: {
        warehouse: { select: { id: true, name: true } },
        _count: { select: { inventories: true } },
        inventories: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                manufacturerName: true,
                style: true,
                color: true,
                category: { select: { stockUnit: true } },
              },
            },
            location: {
              select: {
                id: true,
                locationCode: true,
                warehouse: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: [{ createdAt: "asc" }],
        },
      },
      orderBy: [{ createdAt: "desc" }, { importNumber: "desc" }],
    }),
    prisma.flooringProduct.findMany({
      include: {
        category: { select: { stockUnit: true } },
      },
      orderBy: [{ manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
    }),
    prisma.flooringWarehouse.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    findFlooringLocationsForImports(),
  ])

  return (
    <ImportsClient
      initialImports={entries.map((entry) => ({
        id: entry.id,
        importNumber: entry.importNumber,
        orderNumber: entry.orderNumber ?? "",
        tag: entry.tag ?? "",
        transportType: entry.transportType,
        status: entry.status,
        notes: entry.notes ?? "",
        warehouseId: entry.warehouseId ?? "",
        warehouseName: entry.warehouse?.name ?? "",
        itemsCount: entry._count.inventories,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        inventories: entry.inventories.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: buildProductLabel(item.product),
          stockUnit: item.product.category.stockUnit ?? "",
          itemNumber: item.itemNumber,
          dyeLot: item.dyeLot,
          stockCount: item.stockCount.toString(),
          cost: item.cost?.toString() ?? "",
          freight: item.freight?.toString() ?? "",
          notes: item.notes ?? "",
          locationId: item.locationId,
          locationCode: item.location.locationCode,
          warehouseId: item.location.warehouse.id,
          warehouseName: item.location.warehouse.name,
          sectionName: "",
        })),
      }))}
      productOptions={products.map((product) => ({
        id: product.id,
        label: buildProductLabel(product),
        stockUnit: product.category.stockUnit ?? "",
      }))}
      warehouseOptions={warehouses}
      locationOptions={locations.map((location) => ({
        id: location.id,
        warehouseId: location.warehouseId,
        label: `${location.warehouseName} - ${location.sectionName ? `${location.sectionName} - ` : ""}${location.locationCode}`,
      }))}
    />
  )
}
