import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseDecimal } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>

    const data: {
      stockCount?: ReturnType<typeof parseDecimal>
      cost?: ReturnType<typeof parseDecimal>
      freight?: ReturnType<typeof parseDecimal>
      stockUnit?: string | null
      itemNumber?: string | null
      dyeLot?: string | null
      locationId?: string | null
    } = {}

    if ("stockCount" in body) {
      data.stockCount = parseDecimal(body.stockCount, "stockCount", 4)
    }
    if ("cost" in body) {
      data.cost = parseDecimal(body.cost, "cost", 2)
    }
    if ("freight" in body) {
      data.freight = parseDecimal(body.freight, "freight", 2)
    }

    if ("stockUnit" in body) {
      data.stockUnit = typeof body.stockUnit === "string" ? body.stockUnit.trim() || null : null
    }

    if ("itemNumber" in body) {
      data.itemNumber = typeof body.itemNumber === "string" ? body.itemNumber.trim() || null : null
    }

    if ("dyeLot" in body) {
      data.dyeLot = typeof body.dyeLot === "string" ? body.dyeLot.trim() || null : null
    }
    if ("locationId" in body) {
      data.locationId = typeof body.locationId === "string" ? body.locationId.trim() || null : null
    }

    const lot = await prisma.flooringInventoryLot.update({
      where: { id },
      data,
      include: {
        product: {
          include: {
            category: { select: { name: true } },
          },
        },
        warehouse: { select: { id: true, name: true } },
        location: { select: { id: true, section: { select: { name: true } }, locationCode: true } },
        importBatch: { select: { status: true } },
      },
    })

    return NextResponse.json({
      lot: {
        id: lot.id,
        productId: lot.productId,
        categoryName: lot.product?.category?.name ?? null,
        manufacturer: lot.product?.manufacturer ?? null,
        warehouseId: lot.warehouseId,
        warehouseName: lot.warehouse?.name ?? null,
        section: lot.location?.section?.name ?? null,
        locationId: lot.locationId,
        locationCode: lot.location?.locationCode ?? null,
        itemNumber: lot.itemNumber,
        dyeLot: lot.dyeLot,
        stockCount: lot.stockCount.toString(),
        stockUnit: lot.stockUnit,
        cost: lot.cost?.toString() ?? null,
        freight: lot.freight?.toString() ?? null,
        importStatus: lot.importBatch?.status ?? null,
      },
    })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
