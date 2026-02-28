import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  normalizePrismaError,
  parseOptionalString,
  parseRequiredString,
} from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

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

export async function GET() {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ categories: categories.map(toCategoryResponse) })
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

    const category = await prisma.category.create({
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

    return NextResponse.json({ category: toCategoryResponse(category) }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
