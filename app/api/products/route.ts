import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  normalizePrismaError,
  parseBoolean,
  parseDecimal,
  parseOptionalString,
  parseRequiredString,
} from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"
import type { Prisma } from "@prisma/client"

function toProductResponse(product: {
  id: string
  name: string
  description: string | null
  categoryId: string
  internalCost: Prisma.Decimal
  customerCost: Prisma.Decimal
  laborRate: Prisma.Decimal
  coveragePerUnit: Prisma.Decimal
  isActive: boolean
  createdAt: Date
  category: {
    id: string
    name: string
    stockUnit: string
    purchaseUnit: string
    coverageUnit: string
    rateUnit: string
    altUnit: string | null
  }
}) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    internalCost: product.internalCost.toString(),
    customerCost: product.customerCost.toString(),
    laborRate: product.laborRate.toString(),
    coveragePerUnit: product.coveragePerUnit.toString(),
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    category: product.category,
  }
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const products = await prisma.product.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            stockUnit: true,
            purchaseUnit: true,
            coverageUnit: true,
            rateUnit: true,
            altUnit: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ products: products.map(toProductResponse) })
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

    const product = await prisma.product.create({
      data: {
        name: parseRequiredString(body.name, "name"),
        description: parseOptionalString(body.description),
        categoryId: parseRequiredString(body.categoryId, "categoryId"),
        internalCost: parseDecimal(body.internalCost, "internalCost", 2),
        customerCost: parseDecimal(body.customerCost, "customerCost", 2),
        laborRate: parseDecimal(body.laborRate, "laborRate", 2),
        coveragePerUnit: parseDecimal(body.coveragePerUnit, "coveragePerUnit", 4),
        isActive: body.isActive === undefined ? true : parseBoolean(body.isActive, "isActive"),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            stockUnit: true,
            purchaseUnit: true,
            coverageUnit: true,
            rateUnit: true,
            altUnit: true,
          },
        },
      },
    })

    return NextResponse.json({ product: toProductResponse(product) }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
