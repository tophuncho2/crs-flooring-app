import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseDecimal, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

const importStatusOptions = new Set(["PENDING", "FINAL"])
const transportTypeOptions = new Set(["RETURN", "PURCHASE_ORDER"])

function parseImportStatus(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")

  if (!importStatusOptions.has(normalized)) {
    throw { message: `status must be one of ${Array.from(importStatusOptions).join(", ")}`, field: "status" }
  }

  return normalized
}

function parseTransportType(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")

  if (!transportTypeOptions.has(normalized)) {
    throw { message: `transportType must be one of ${Array.from(transportTypeOptions).join(", ")}`, field: "transportType" }
  }

  return normalized
}

function parseOptionalDecimal(value: unknown, field: string, scale: number) {
  if (value === undefined || value === null || String(value).trim() === "") return null
  return parseDecimal(value, field, scale)
}

type ParsedImportItem = {
  productId: string
  itemNumber: string
  dyeLot: string
  stockCount: Prisma.Decimal
  cost: Prisma.Decimal | null
  freight: Prisma.Decimal | null
  notes: string | null
  locationId: string
}

function parseImportItems(items: unknown[]): ParsedImportItem[] {
  return items.flatMap((item, index) => {
    if (!item || typeof item !== "object") return []

    const row = item as Record<string, unknown>
    const itemNumber = String(row.itemNumber ?? "").trim()
    const dyeLot = String(row.dyeLot ?? "").trim()

    return [
      {
        productId: parseRequiredString(row.productId, `Item ${index + 1}: product`),
        itemNumber,
        dyeLot,
        stockCount: parseDecimal(row.stockCount, `Item ${index + 1}: stockCount`, 2),
        cost: parseOptionalDecimal(row.cost, `Item ${index + 1}: cost`, 2),
        freight: parseOptionalDecimal(row.freight, `Item ${index + 1}: freight`, 2),
        notes: parseOptionalString(row.notes),
        locationId: parseRequiredString(row.locationId, `Item ${index + 1}: location`),
      },
    ]
  })
}

function buildProductName(product: {
  name: string
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return product.name || [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Flooring Product"
}

function normalizeImportInventory(row: {
  id: string
  productId: string
  itemNumber: string
  dyeLot: string
  stockCount: Prisma.Decimal
  cost: Prisma.Decimal | null
  freight: Prisma.Decimal | null
  notes: string | null
  locationId: string
  product: {
    id: string
    name: string
    manufacturerName: string | null
    style: string | null
    color: string | null
    category: { stockUnit: string | null }
  }
  location: {
    id: string
    locationCode: string
    warehouse: { id: string; name: string }
  }
}) {
  return {
    id: row.id,
    productId: row.productId,
    productName: buildProductName(row.product),
    stockUnit: row.product.category.stockUnit ?? "",
    itemNumber: row.itemNumber,
    dyeLot: row.dyeLot,
    stockCount: row.stockCount.toString(),
    cost: row.cost?.toString() ?? "",
    freight: row.freight?.toString() ?? "",
    notes: row.notes ?? "",
    locationId: row.locationId,
    locationCode: row.location.locationCode,
    warehouseId: row.location.warehouse.id,
    warehouseName: row.location.warehouse.name,
    sectionName: "",
  }
}

function normalizeImportEntry(entry: {
  id: string
  importNumber: number
  orderNumber: string | null
  tag: string | null
  transportType: string
  status: string
  notes: string | null
  warehouseId: string | null
  warehouse: { id: string; name: string } | null
  createdAt: Date
  updatedAt: Date
  inventories?: Array<{
    id: string
    productId: string
    itemNumber: string
    dyeLot: string
    stockCount: Prisma.Decimal
    cost: Prisma.Decimal | null
    freight: Prisma.Decimal | null
    notes: string | null
    locationId: string
    product: {
      id: string
      name: string
      manufacturerName: string | null
      style: string | null
      color: string | null
      category: { stockUnit: string | null }
    }
    location: {
      id: string
      locationCode: string
      warehouse: { id: string; name: string }
    }
  }>
  _count?: { inventories: number }
}) {
  return {
    id: entry.id,
    importNumber: entry.importNumber,
    orderNumber: entry.orderNumber ?? "",
    tag: entry.tag ?? "",
    transportType: entry.transportType,
    status: entry.status,
    notes: entry.notes ?? "",
    warehouseId: entry.warehouseId ?? "",
    warehouseName: entry.warehouse?.name ?? "",
    itemsCount: entry._count?.inventories ?? entry.inventories?.length ?? 0,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    inventories: entry.inventories?.map(normalizeImportInventory) ?? [],
  }
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const entries = await prisma.flooringImportEntry.findMany({
      include: {
        warehouse: { select: { id: true, name: true } },
        _count: { select: { inventories: true } },
      },
      orderBy: [{ createdAt: "desc" }, { importNumber: "desc" }],
    })

    return NextResponse.json({ imports: entries.map(normalizeImportEntry) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const body = (await request.json()) as Record<string, unknown>
    const itemPayload = Array.isArray(body.items) ? body.items : []
    const parsedItems = parseImportItems(itemPayload)

    const created = await prisma.$transaction(async (tx) => {
      const warehouseId = parseOptionalString(body.warehouseId)

      if (warehouseId && parsedItems.length > 0) {
        const locations = await tx.flooringLocation.findMany({
          where: { id: { in: parsedItems.map((item) => item.locationId) } },
          select: { id: true, warehouseId: true },
        })
        const locationMap = new Map(locations.map((location) => [location.id, location]))

        for (const [index, item] of parsedItems.entries()) {
          const location = locationMap.get(item.locationId)
          if (!location) {
            throw { message: `Item ${index + 1}: location is invalid`, field: "locationId" }
          }
          if (location.warehouseId !== warehouseId) {
            throw { message: `Item ${index + 1}: location does not belong to the selected warehouse`, field: "locationId" }
          }
        }
      }

      const entry = await tx.flooringImportEntry.create({
        data: {
          orderNumber: parseOptionalString(body.orderNumber),
          tag: parseOptionalString(body.tag),
          transportType: parseTransportType(body.transportType),
          status: parseImportStatus(body.status),
          notes: parseOptionalString(body.notes),
          warehouseId,
        },
      })

      for (const item of parsedItems) {
        await tx.flooringInventory.create({
          data: {
            importEntryId: entry.id,
            productId: item.productId,
            itemNumber: item.itemNumber,
            dyeLot: item.dyeLot,
            stockCount: item.stockCount,
            cost: item.cost,
            freight: item.freight,
            notes: item.notes,
            locationId: item.locationId,
          },
        })
      }

      return tx.flooringImportEntry.findUniqueOrThrow({
        where: { id: entry.id },
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
      })
    })

    return NextResponse.json({ import: normalizeImportEntry(created) }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
