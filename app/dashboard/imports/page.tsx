import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import ImportsClient, {
  type ImportHeader,
  type ImportLine,
  type ImportLocation,
  type ImportProduct,
  type ImportWarehouse,
} from "./imports-client"

type ImportBatchQueryRow = {
  id: string
  importNumber: number | null
  importTag: string | null
  transportType: string | null
  status: string | null
  warehouseId: string | null
  createdAt: Date
  warehouse: { id: string; name: string } | null
  _count: { inventory: number }
}

type WarehouseQueryRow = { id: string; name: string }

type ProductQueryRow = {
  id: string
  manufacturer: string | null
  category: { name: string; stockUnit: string | null } | null
}

type LocationQueryRow = {
  id: string
  warehouseId: string
  locationCode: string
  warehouse: { id: string; name: string }
}

type InventoryLineQueryRow = {
  id: string
  importBatchId: string | null
  importBatch: { id: string; status: string | null; warehouseId: string | null } | null
  productId: string
  product: { manufacturer: string | null; category: { name: string } | null } | null
  warehouseId: string | null
  locationId: string | null
  location: { locationCode: string } | null
  itemNumber: string | null
  dyeLot: string | null
  stockCount: { toString(): string }
  stockUnit: string | null
  cost: { toString(): string } | null
  freight: { toString(): string } | null
  updatedAt: Date
}

export default async function ImportsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  })

  if (!user) redirect("/login")
  if (user.role !== "BUILDER" && user.role !== "ADMIN") redirect("/dashboard")

  const [importsResult, warehousesResult, productsResult, locationsResult, linesResult] = await Promise.allSettled([
    prisma.flooringImportBatch.findMany({
      select: {
        id: true,
        importNumber: true,
        importTag: true,
        transportType: true,
        status: true,
        warehouseId: true,
        createdAt: true,
        warehouse: { select: { id: true, name: true } },
        _count: { select: { inventory: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.flooringWarehouse.findMany({ orderBy: { name: "asc" } }),
    prisma.flooringProduct.findMany({
      include: { category: { select: { name: true, stockUnit: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.flooringLocation.findMany({
      include: {
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: { locationCode: "asc" },
    }),
    prisma.flooringInventoryLot.findMany({
      where: { importBatchId: { not: null } },
      include: {
        importBatch: { select: { id: true, status: true, warehouseId: true } },
        product: { include: { category: { select: { name: true } } } },
        location: { select: { locationCode: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ])

  const imports: ImportBatchQueryRow[] = importsResult.status === "fulfilled" ? (importsResult.value as ImportBatchQueryRow[]) : []
  const warehouses: WarehouseQueryRow[] =
    warehousesResult.status === "fulfilled" ? (warehousesResult.value as WarehouseQueryRow[]) : []
  const products: ProductQueryRow[] = productsResult.status === "fulfilled" ? (productsResult.value as ProductQueryRow[]) : []
  const locations: LocationQueryRow[] =
    locationsResult.status === "fulfilled" ? (locationsResult.value as LocationQueryRow[]) : []
  const lines: InventoryLineQueryRow[] = linesResult.status === "fulfilled" ? (linesResult.value as InventoryLineQueryRow[]) : []

  const importHeaders: ImportHeader[] = imports.map((row) => ({
    id: row.id,
    importNumber: row.importNumber,
    importTag: row.importTag,
    transportType: row.transportType,
    status: row.status,
    warehouseId: row.warehouseId,
    warehouseName: row.warehouse?.name ?? null,
    totalCost: "0.00",
    lineCount: row._count.inventory,
    createdAt: row.createdAt.toISOString(),
  }))

  const warehouseRows: ImportWarehouse[] = warehouses.map((row) => ({
    id: row.id,
    name: row.name,
  }))

  const productRows: ImportProduct[] = products.map((row) => ({
    id: row.id,
    label: row.id,
    categoryName: row.category?.name ?? null,
    manufacturer: row.manufacturer,
    stockUnit: row.category?.stockUnit ?? null,
  }))

  const locationRows: ImportLocation[] = locations.map((row) => ({
    id: row.id,
    label: row.locationCode,
    warehouseId: row.warehouseId,
    warehouseName: row.warehouse.name,
    sectionName: null,
  }))

  const lineRows: ImportLine[] = lines.map((row) => ({
    id: row.id,
    importBatchId: row.importBatchId as string,
    importStatus: row.importBatch?.status ?? null,
    productId: row.productId,
    categoryName: row.product?.category?.name ?? null,
    manufacturer: row.product?.manufacturer ?? null,
    warehouseId: row.warehouseId,
    sectionName: null,
    locationId: row.locationId,
    locationCode: row.location?.locationCode ?? null,
    itemNumber: row.itemNumber,
    dyeLot: row.dyeLot,
    stockCount: row.stockCount.toString(),
    stockUnit: row.stockUnit,
    cost: row.cost?.toString() ?? "0.00",
    freight: row.freight?.toString() ?? "0.00",
    updatedAt: row.updatedAt.toISOString(),
  }))

  return (
    <ImportsClient
      initialImports={importHeaders}
      warehouses={warehouseRows}
      products={productRows}
      locations={locationRows}
      initialLines={lineRows}
    />
  )
}
