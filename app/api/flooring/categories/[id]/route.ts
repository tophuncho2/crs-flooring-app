import { NextResponse } from "next/server"
import { flooringCategoryUnitInclude, normalizeCategoryUnitValues } from "@/lib/flooring-unit-measures"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

function normalizeCategory(category: {
  id: string
  name: string
  sendUnit: { id: string; name: string } | null
  stockUnit: { id: string; name: string } | null
  coverageAvailableUnit: { id: string; name: string } | null
  itemCoverageUnit: { id: string; name: string } | null
  createdAt: Date
  _count?: { products: number }
}) {
  return {
    id: category.id,
    name: category.name,
    ...normalizeCategoryUnitValues(category),
    productCount: category._count?.products ?? 0,
    createdAt: category.createdAt.toISOString(),
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
  if (authError) return authError

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const category = await prisma.flooringCategory.update({
      where: { id },
      data: {
        name: parseRequiredString(body.name, "name"),
        sendUnitId: parseOptionalString(body.sendUnitId),
        stockUnitId: parseOptionalString(body.stockUnitId),
        coverageAvailableUnitId: parseOptionalString(body.coverageAvailableUnitId),
        itemCoverageUnitId: parseOptionalString(body.itemCoverageUnitId),
      },
      include: {
        ...flooringCategoryUnitInclude,
        _count: {
          select: { products: true },
        },
      },
    })

    return NextResponse.json({ category: normalizeCategory(category) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
  if (authError) return authError

  try {
    const { id } = await context.params
    await prisma.flooringCategory.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
