import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseDecimal, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

function buildProductName(product: {
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Flooring Product"
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const items = await prisma.flooringWorkOrderItem.findMany({
      where: { workOrderId: id },
      include: {
        product: {
          select: {
            id: true,
            manufacturerName: true,
            style: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: buildProductName(item.product),
        quantity: item.quantity.toString(),
        notes: item.notes ?? "",
      })),
    })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>

    const productId = parseRequiredString(body.productId, "productId")
    const quantity = parseDecimal(body.quantity, "quantity", 2)
    const notes = parseOptionalString(body.notes)

    await prisma.flooringWorkOrder.findUniqueOrThrow({ where: { id } })

    const created = await prisma.flooringWorkOrderItem.create({
      data: {
        workOrderId: id,
        productId,
        quantity,
        notes,
      },
      include: {
        product: {
          select: {
            id: true,
            manufacturerName: true,
            style: true,
            color: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        item: {
          id: created.id,
          productId: created.productId,
          productName: buildProductName(created.product),
          quantity: created.quantity.toString(),
          notes: created.notes ?? "",
        },
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "The selected product or work order does not exist" }, { status: 404 })
    }

    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
