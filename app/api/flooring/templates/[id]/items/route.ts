import { NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { normalizePrismaError, parseDecimal, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"

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

function normalizeTemplateItem(item: {
  id: string
  productId: string
  quantity: { toString(): string }
  notes: string | null
  storedDyeLot: string | null
  createdAt: Date
  product: {
    manufacturerName: string | null
    style: string | null
    color: string | null
    category: { sendUnit: { name: string } | null }
  }
}) {
  return {
    id: item.id,
    productId: item.productId,
    productName: buildProductName(item.product),
    sendUnit: item.product.category.sendUnit?.name ?? "",
    quantity: item.quantity.toString(),
    notes: item.notes ?? "",
    storedDyeLot: item.storedDyeLot ?? "",
    createdAt: item.createdAt.toISOString(),
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const items = await prisma.flooringTemplateItem.findMany({
      where: { templateId: id },
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
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ items: items.map(normalizeTemplateItem) })
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

    await prisma.flooringTemplate.findUniqueOrThrow({ where: { id } })

    const created = await prisma.flooringTemplateItem.create({
      data: {
        templateId: id,
        productId: parseRequiredString(body.productId, "productId"),
        quantity: parseDecimal(body.quantity, "quantity", 2),
        notes: parseOptionalString(body.notes),
        storedDyeLot: parseOptionalString(body.storedDyeLot),
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

    return NextResponse.json({ item: normalizeTemplateItem(created) }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
