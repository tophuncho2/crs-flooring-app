import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  normalizePrismaError,
  parseDecimal,
  parseDecimalOrDefault,
  parseOptionalString,
  parseRequiredString,
} from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

export async function GET(request: Request) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const importBatchId = searchParams.get("importBatchId")

    const lots = await prisma.flooringInventoryLot.findMany({
      where: importBatchId ? { importBatchId } : undefined,
      include: {
        product: { include: { category: { select: { name: true, stockUnit: true } } } },
        warehouse: { select: { id: true, name: true } },
        location: { select: { id: true, locationCode: true } },
        importBatch: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ lots })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const body = (await request.json()) as Record<string, unknown>

    const productId = parseRequiredString(body.productId, "productId")
    const importBatchId = parseOptionalString(body.importBatchId)
    const locationId = parseOptionalString(body.locationId)

    let warehouseId: string | null = null
    if (importBatchId) {
      const importBatch = await prisma.flooringImportBatch.findUnique({
        where: { id: importBatchId },
        select: { warehouseId: true },
      })
      warehouseId = importBatch?.warehouseId ?? null
    }

    const product = await prisma.flooringProduct.findUnique({
      where: { id: productId },
      include: { category: { select: { stockUnit: true } } },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const lot = await prisma.flooringInventoryLot.create({
      data: {
        productId,
        importBatchId,
        warehouseId,
        locationId,
        itemNumber: parseOptionalString(body.itemNumber),
        dyeLot: parseOptionalString(body.dyeLot),
        stockCount: parseDecimal(body.stockCount, "stockCount", 4),
        cost: parseDecimalOrDefault(body.cost, "cost", 2, "0.00"),
        freight: parseDecimalOrDefault(body.freight, "freight", 2, "0.00"),
        stockUnit: product.category?.stockUnit ?? null,
      },
      include: {
        product: { include: { category: { select: { name: true } } } },
        warehouse: { select: { id: true, name: true } },
        location: { select: { id: true, locationCode: true } },
        importBatch: { select: { id: true, status: true } },
      },
    })

    return NextResponse.json({ lot }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
