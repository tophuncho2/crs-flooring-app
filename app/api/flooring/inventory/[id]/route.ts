import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseDecimal, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
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

    return NextResponse.json({
      inventory: {
        id: inventory.id,
        productId: inventory.productId,
        productName:
          inventory.product.name ||
          [inventory.product.manufacturerName, inventory.product.style, inventory.product.color].filter(Boolean).join(" - ") ||
          "Flooring Product",
        itemNumber: String(inventory.itemNumber),
        dyeLot: String(inventory.dyeLot),
        locationId: inventory.locationId,
        locationCode: inventory.location.locationCode,
        warehouseName: inventory.location.warehouse.name,
        sectionName: inventory.location.section?.name ?? "",
        stockCount: inventory.stockCount.toString(),
        notes: inventory.notes ?? "",
        createdAt: inventory.createdAt.toISOString(),
        updatedAt: inventory.updatedAt.toISOString(),
      },
    })
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
