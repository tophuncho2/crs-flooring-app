import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

function normalizeCategory(category: {
  id: string
  name: string
  sendUnit: string | null
  stockUnit: string | null
  coverageAvailableUnit: string | null
  itemCoverageUnit: string | null
  createdAt: Date
  _count?: { products: number }
}) {
  return {
    id: category.id,
    name: category.name,
    sendUnit: category.sendUnit ?? "",
    stockUnit: category.stockUnit ?? "",
    coverageAvailableUnit: category.coverageAvailableUnit ?? "",
    itemCoverageUnit: category.itemCoverageUnit ?? "",
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
        sendUnit: parseOptionalString(body.sendUnit),
        stockUnit: parseOptionalString(body.stockUnit),
        coverageAvailableUnit: parseOptionalString(body.coverageAvailableUnit),
        itemCoverageUnit: parseOptionalString(body.itemCoverageUnit),
      },
      include: {
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
