import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseDecimal, parseOptionalString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

function parseOptionalDecimal(value: unknown, field: string): string | null {
  if (value === undefined || value === null || String(value).trim() === "") return null
  return parseDecimal(value, field, 2).toString()
}

function buildProductName(product: {
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Flooring Product"
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { itemId } = await params
    const body = (await request.json()) as Record<string, unknown>

    const item = await prisma.flooringWorkOrderItem.findUnique({ where: { id: itemId } })
    if (!item) {
      return NextResponse.json({ error: "Work order item not found" }, { status: 404 })
    }

    const data: { productId?: string; quantity?: string; notes?: string | null } = {}
    if ("productId" in body) data.productId = String(body.productId ?? "")
    if ("quantity" in body) data.quantity = parseOptionalDecimal(body.quantity, "quantity") ?? ""
    if ("notes" in body) data.notes = parseOptionalString(body.notes)

    const updated = await prisma.flooringWorkOrderItem.update({
      where: { id: itemId },
      data: {
        productId: data.productId,
        quantity: data.quantity === undefined ? undefined : data.quantity,
        notes: data.notes,
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

    return NextResponse.json({
      item: {
        id: updated.id,
        productId: updated.productId,
        productName: buildProductName(updated.product),
        quantity: updated.quantity.toString(),
        notes: updated.notes ?? "",
      },
    })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { itemId } = await params
    await prisma.flooringWorkOrderItem.delete({ where: { id: itemId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
