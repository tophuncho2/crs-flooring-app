import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseDecimal, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

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
  cutLogs?: Array<{
    id: string
    inventoryId: string
    quantityTaken: { toString(): string }
    notes: string | null
    createdAt: Date
  }>
}) {
  const cutLogs = row.cutLogs ?? []
  const cutTotal = cutLogs.reduce((total, log) => total + Number(log.quantityTaken), 0)
  const runningBalance = Number(row.stockCount) - cutTotal

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
    cutTotal: cutTotal.toFixed(2),
    runningBalance: runningBalance.toFixed(2),
    cost: row.cost?.toString() ?? "",
    freight: row.freight?.toString() ?? "",
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    cutLogs: cutLogs.map((log) => ({
      id: log.id,
      inventoryId: log.inventoryId,
      inventoryLabel: `${row.location.warehouse.name} / ${row.location.locationCode} / Item ${row.itemNumber}${row.dyeLot ? ` / Dye ${row.dyeLot}` : ""}`,
      itemNumber: row.itemNumber,
      quantityTaken: log.quantityTaken.toString(),
      notes: log.notes ?? "",
      createdAt: log.createdAt.toISOString(),
    })),
  }
}

export async function GET(request: Request) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get("productId")?.trim() ?? ""

    const inventory = await prisma.flooringInventory.findMany({
      where: productId ? { productId } : undefined,
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
        cutLogs: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            inventoryId: true,
            quantityTaken: true,
            notes: true,
            createdAt: true,
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
      orderBy: [{ updatedAt: "desc" }, { itemNumber: "asc" }],
    })

    return NextResponse.json({ inventory: inventory.map(normalizeInventoryRow) })
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
    const inventory = await prisma.flooringInventory.create({
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

    return NextResponse.json({ inventory: normalizeInventoryRow(inventory) }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
