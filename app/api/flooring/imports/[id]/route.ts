import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { normalizePrismaError, parseDecimal, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

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
  locationId: string | null
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
        locationId: parseOptionalString(row.locationId),
      },
    ]
  })
}

async function validateImportLocationIds(tx: Prisma.TransactionClient, warehouseId: string | null, items: ParsedImportItem[]) {
  const explicitLocationIds = items.map((item) => item.locationId).filter((value): value is string => Boolean(value))
  if (explicitLocationIds.length === 0) return items

  const locations = await tx.flooringLocation.findMany({
    where: { id: { in: explicitLocationIds } },
    select: { id: true, warehouseId: true, sectionId: true },
  })
  const locationMap = new Map(locations.map((location) => [location.id, location]))

  return items.map((item, index) => {
    if (!item.locationId) return item

    const explicitLocation = locationMap.get(item.locationId)
    if (!explicitLocation) {
      throw { message: `Item ${index + 1}: location is invalid`, field: "locationId" }
    }
    if (!explicitLocation.sectionId) {
      throw { message: `Item ${index + 1}: location must belong to a section`, field: "locationId" }
    }
    if (warehouseId && explicitLocation.warehouseId !== warehouseId) {
      throw { message: `Item ${index + 1}: location does not belong to the selected warehouse`, field: "locationId" }
    }
    return item
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
  locationId: string | null
  product: {
    id: string
    name: string
    manufacturerName: string | null
    style: string | null
    color: string | null
    category: { stockUnit: { name: string } | null }
  }
  location: {
    id: string
    locationCode: string
    section: { name: string } | null
    warehouse: { id: string; name: string }
  } | null
}) {
  return {
    id: row.id,
    productId: row.productId,
    productName: buildProductName(row.product),
    stockUnit: row.product.category.stockUnit?.name ?? "",
    itemNumber: row.itemNumber,
    dyeLot: row.dyeLot,
    stockCount: row.stockCount.toString(),
    cost: row.cost?.toString() ?? "",
    freight: row.freight?.toString() ?? "",
    notes: row.notes ?? "",
    locationId: row.locationId ?? "",
    locationCode: row.location?.locationCode ?? "",
    warehouseId: row.location?.warehouse.id ?? "",
    warehouseName: row.location?.warehouse.name ?? "",
    sectionName: row.location?.section?.name ?? "",
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
  inventories: Array<{
    id: string
    productId: string
    itemNumber: string
    dyeLot: string
    stockCount: Prisma.Decimal
    cost: Prisma.Decimal | null
    freight: Prisma.Decimal | null
    notes: string | null
    locationId: string | null
    product: {
      id: string
      name: string
      manufacturerName: string | null
      style: string | null
      color: string | null
      category: { stockUnit: { name: string } | null }
    }
    location: {
      id: string
      locationCode: string
      section: { name: string } | null
      warehouse: { id: string; name: string }
    } | null
  }>
  _count: { inventories: number }
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
    itemsCount: entry._count.inventories,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    inventories: entry.inventories.map(normalizeImportInventory),
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const itemPayload = Array.isArray(body.items) ? body.items : []
    const parsedItems = parseImportItems(itemPayload)

    const entry = await prisma.$transaction(async (tx) => {
      const warehouseId = parseOptionalString(body.warehouseId)
      const validatedItems = await validateImportLocationIds(tx, warehouseId, parsedItems)

      await tx.flooringImportEntry.update({
        where: { id },
        data: {
          orderNumber: parseOptionalString(body.orderNumber),
          tag: parseOptionalString(body.tag),
          transportType: parseTransportType(body.transportType),
          status: parseImportStatus(body.status),
          notes: parseOptionalString(body.notes),
          warehouseId,
        },
      })

      await tx.flooringInventory.deleteMany({ where: { importEntryId: id } })

      for (const item of validatedItems) {
        await tx.flooringInventory.create({
          data: {
            importEntryId: id,
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
        where: { id },
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
                  category: { select: { stockUnit: { select: { name: true } } } },
                },
              },
              location: {
                select: {
                  id: true,
                  locationCode: true,
                  section: { select: { name: true } },
                  warehouse: { select: { id: true, name: true } },
                },
              },
            },
            orderBy: [{ createdAt: "asc" }],
          },
        },
      })
    })

    return NextResponse.json({ import: normalizeImportEntry(entry) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await context.params
    const entry = await prisma.flooringImportEntry.findUnique({
      where: { id },
      select: { id: true, _count: { select: { inventories: true } } },
    })

    if (!entry) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 })
    }

    if (entry._count.inventories > 0) {
      return NextResponse.json(
        { error: "This import has inventory rows and cannot be deleted" },
        { status: 409 },
      )
    }

    await prisma.flooringImportEntry.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
