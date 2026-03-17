import { NextResponse } from "next/server"
import { flooringCategoryUnitInclude, normalizeCategoryUnitValues } from "@/server/flooring/unit-measures"
import { prisma } from "@/server/db/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"

function normalizeCategory(category: {
  id: string
  name: string
  sendUnit: { id: string; name: string } | null
  stockUnit: { id: string; name: string } | null
  coverageAvailableUnit: { id: string; name: string } | null
  itemCoverageUnit: { id: string; name: string } | null
  serviceUnit: { id: string; name: string } | null
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

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
  if (authError) return authError

  try {
    const categories = await prisma.flooringCategory.findMany({
      include: {
        ...flooringCategoryUnitInclude,
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ categories: categories.map(normalizeCategory) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
  if (authError) return authError

  try {
    const body = (await request.json()) as Record<string, unknown>
    const category = await prisma.flooringCategory.create({
      data: {
        name: parseRequiredString(body.name, "name"),
        sendUnitId: parseOptionalString(body.sendUnitId),
        stockUnitId: parseOptionalString(body.stockUnitId),
        coverageAvailableUnitId: parseOptionalString(body.coverageAvailableUnitId),
        itemCoverageUnitId: parseOptionalString(body.itemCoverageUnitId),
        serviceUnitId: parseOptionalString(body.serviceUnitId),
      },
      include: {
        ...flooringCategoryUnitInclude,
        _count: {
          select: { products: true },
        },
      },
    })

    return NextResponse.json({ category: normalizeCategory(category) }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
