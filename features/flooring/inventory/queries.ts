import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { withPrismaConnectivityHandling } from "@/server/db/prisma-errors"

function buildProductName(product: {
  name: string
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return product.name || [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Flooring Product"
}

function toFixedString(value: Prisma.Decimal | number) {
  const numeric = Number(value)
  return numeric.toFixed(2)
}

async function loadInventoryPageData() {
  const inventory = await prisma.flooringInventory.findMany({
    include: {
      product: {
        select: {
          id: true,
          name: true,
          manufacturerName: true,
          style: true,
          color: true,
          category: { select: { stockUnit: { select: { name: true } } } },
        },
      },
      location: {
        select: {
          id: true,
          locationCode: true,
          warehouse: { select: { id: true, name: true } },
        },
      },
      importEntry: {
        select: {
          id: true,
          importNumber: true,
          tag: true,
          status: true,
          transportType: true,
          warehouse: { select: { id: true, name: true } },
        },
      },
      cutLogs: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          inventoryId: true,
          before: true,
          cut: true,
          after: true,
          notes: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { itemNumber: "asc" }],
  })

  return {
    initialInventory: inventory.map((row) => {
      const cutTotal = row.cutLogs.reduce((total, log) => total + Number(log.cut), 0)
      const runningBalance = Number(row.stockCount) - cutTotal

      return {
        id: row.id,
        importEntryId: row.importEntryId ?? "",
        importNumber: row.importEntry?.importNumber ? String(row.importEntry.importNumber) : "",
        importTag: row.importEntry?.tag ?? "",
        importStatus: row.importEntry?.status ?? "FINAL",
        importTransportType: row.importEntry?.transportType ?? "",
        importWarehouseName: row.importEntry?.warehouse?.name ?? row.location?.warehouse.name ?? "",
        productId: row.productId,
        productName: buildProductName(row.product),
        stockUnit: row.product.category.stockUnit?.name ?? "",
        itemNumber: row.itemNumber,
        dyeLot: row.dyeLot,
        locationId: row.locationId ?? "",
        locationCode: row.location?.locationCode ?? "",
        warehouseName: row.location?.warehouse.name ?? "",
        sectionName: "",
        stockCount: row.stockCount.toString(),
        cutTotal: cutTotal.toFixed(2),
        runningBalance: runningBalance.toFixed(2),
        cost: row.cost?.toString() ?? "",
        freight: row.freight?.toString() ?? "",
        notes: row.notes ?? "",
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        cutLogs: row.cutLogs.map((log) => ({
          id: log.id,
          inventoryId: log.inventoryId,
          inventoryLabel: buildProductName(row.product),
          itemNumber: row.itemNumber,
          before: toFixedString(log.before),
          cut: toFixedString(log.cut),
          after: toFixedString(log.after),
          notes: log.notes ?? "",
          createdAt: log.createdAt.toISOString(),
        })),
      }
    }),
  }
}

export async function getInventoryPageData() {
  return withPrismaConnectivityHandling(loadInventoryPageData)
}
