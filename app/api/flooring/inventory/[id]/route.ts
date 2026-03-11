import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseDecimal, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

function buildProductName(product: {
  name: string
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return product.name || [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Flooring Product"
}

function normalizeInventoryRow(row: {
  id: string
  importEntryId: string | null
  itemNumber: string
  dyeLot: string
  stockCount: { toString(): string }
  cost: { toString(): string } | null
  freight: { toString(): string } | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  productId: string
  product: {
    id: string
    name: string
    manufacturerName: string | null
    style: string | null
    color: string | null
    category: { stockUnit: string | null }
  }
  locationId: string
  location: {
    id: string
    locationCode: string
    warehouse: { id: string; name: string }
  }
  importEntry: {
    id: string
    importNumber: number
    tag: string | null
    status: string
    transportType: string
    warehouse: { id: string; name: string } | null
  } | null
}) {
  return {
    id: row.id,
    importEntryId: row.importEntryId ?? "",
    importNumber: row.importEntry?.importNumber ? String(row.importEntry.importNumber) : "",
    importTag: row.importEntry?.tag ?? "",
    importStatus: row.importEntry?.status ?? "FINAL",
    importTransportType: row.importEntry?.transportType ?? "",
    importWarehouseName: row.importEntry?.warehouse?.name ?? row.location.warehouse.name,
    productId: row.productId,
    productName: buildProductName(row.product),
    stockUnit: row.product.category.stockUnit ?? "",
    itemNumber: row.itemNumber,
    dyeLot: row.dyeLot,
    locationId: row.locationId,
    locationCode: row.location.locationCode,
    warehouseName: row.location.warehouse.name,
    sectionName: "",
    stockCount: row.stockCount.toString(),
    cost: row.cost?.toString() ?? "",
    freight: row.freight?.toString() ?? "",
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const inventory = await prisma.flooringInventory.update({
      where: { id },
      data: {
        importEntryId: parseOptionalString(body.importEntryId),
        productId: parseRequiredString(body.productId, "productId"),
        locationId: parseRequiredString(body.locationId, "locationId"),
        itemNumber: parseRequiredString(body.itemNumber, "itemNumber"),
        dyeLot: parseRequiredString(body.dyeLot, "dyeLot"),
        stockCount: parseDecimal(body.stockCount, "stockCount", 2),
        cost: body.cost === "" || body.cost === null || body.cost === undefined ? null : parseDecimal(body.cost, "cost", 2),
        freight: body.freight === "" || body.freight === null || body.freight === undefined ? null : parseDecimal(body.freight, "freight", 2),
        notes: parseOptionalString(body.notes),
      },
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
      },
    })

    return NextResponse.json({ inventory: normalizeInventoryRow(inventory) })
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
    await prisma.flooringInventory.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
