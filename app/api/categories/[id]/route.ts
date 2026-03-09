import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  normalizePrismaError,
  parseOptionalString,
  parseRequiredString,
} from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

function toCategoryResponse(category: {
  id: string
  name: string
  stockUnit: string
  purchaseUnit: string
  coverageUnit: string
  rateUnit: string
  altUnit: string | null
  createdAt: Date
  _count?: { products: number }
}) {
  return {
    id: category.id,
    name: category.name,
    stockUnit: category.stockUnit,
    purchaseUnit: category.purchaseUnit,
    coverageUnit: category.coverageUnit,
    rateUnit: category.rateUnit,
    altUnit: category.altUnit,
    createdAt: category.createdAt.toISOString(),
    productCount: category._count?.products ?? 0,
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: parseRequiredString(body.name, "name"),
        stockUnit: parseRequiredString(body.stockUnit, "stockUnit"),
        purchaseUnit: parseRequiredString(body.purchaseUnit, "purchaseUnit"),
        coverageUnit: parseRequiredString(body.coverageUnit, "coverageUnit"),
        rateUnit: parseRequiredString(body.rateUnit, "rateUnit"),
        altUnit: parseOptionalString(body.altUnit),
      },
      include: { _count: { select: { products: true } } },
    })

    return NextResponse.json({ category: toCategoryResponse(category) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
  if (authError) return authError

  try {
    const { id } = await params

    const linkedCount = await prisma.product.count({ where: { categoryId: id } })

    if (linkedCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with linked products" },
        { status: 409 },
      )
    }

    await prisma.category.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
