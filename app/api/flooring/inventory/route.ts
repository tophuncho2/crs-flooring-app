import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseDecimal, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

function normalizeInventoryRow(row: {
  id: string
  productId: string
  itemNumber: number
  dyeLot: number
  locationId: string
  stockCount: { toString(): string }
  notes: string | null
  createdAt: Date
  updatedAt: Date
  product: { id: string; name: string; manufacturerName: string | null; style: string | null; color: string | null }
  location: { id: string; locationCode: string; warehouse: { id: string; name: string }; section: { id: string; name: string } | null }
}) {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.product.name || [row.product.manufacturerName, row.product.style, row.product.color].filter(Boolean).join(" - ") || "Flooring Product",
    itemNumber: String(row.itemNumber),
    dyeLot: String(row.dyeLot),
    locationId: row.locationId,
    locationCode: row.location.locationCode,
    warehouseName: row.location.warehouse.name,
    sectionName: row.location.section?.name ?? "",
    stockCount: row.stockCount.toString(),
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const inventory = await prisma.flooringInventory.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            manufacturerName: true,
            style: true,
            color: true,
          },
        },
        location: {
          select: {
            id: true,
            locationCode: true,
            warehouse: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
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
        productId: parseRequiredString(body.productId, "productId"),
        locationId: parseRequiredString(body.locationId, "locationId"),
        itemNumber: Number(parseRequiredString(body.itemNumber, "itemNumber")),
        dyeLot: Number(parseRequiredString(body.dyeLot, "dyeLot")),
        stockCount: parseDecimal(body.stockCount, "stockCount", 2),
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
          },
        },
        location: {
          select: {
            id: true,
            locationCode: true,
            warehouse: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
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
