import { NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { normalizePrismaError, parseDecimal, parseOptionalString } from "@/server/http/api-helpers"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
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

    const updated = await prisma.flooringTemplateItem.update({
      where: { id: itemId },
      data: {
        productId: "productId" in body ? String(body.productId ?? "") : undefined,
        quantity: "quantity" in body ? parseDecimal(body.quantity, "quantity", 2) : undefined,
        notes: "notes" in body ? parseOptionalString(body.notes) : undefined,
        storedDyeLot: "storedDyeLot" in body ? parseOptionalString(body.storedDyeLot) : undefined,
      },
      include: {
        product: {
          select: {
            manufacturerName: true,
            style: true,
            color: true,
            category: { select: { sendUnit: { select: { name: true } } } },
          },
        },
      },
    })

    return NextResponse.json({
      item: {
        id: updated.id,
        productId: updated.productId,
        productName: buildProductName(updated.product),
        sendUnit: updated.product.category.sendUnit?.name ?? "",
        quantity: updated.quantity.toString(),
        notes: updated.notes ?? "",
        storedDyeLot: updated.storedDyeLot ?? "",
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
    await prisma.flooringTemplateItem.delete({ where: { id: itemId } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
