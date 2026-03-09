import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  normalizePrismaError,
  parseBoolean,
  parseDecimalOrDefault,
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
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
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
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
  if (authError) return authError

  try {
    const body = (await request.json()) as Record<string, unknown>
    const internalCostProvided =
      body.internalCost !== undefined && body.internalCost !== null && String(body.internalCost).trim() !== ""
    const customerCostProvided =
      body.customerCost !== undefined && body.customerCost !== null && String(body.customerCost).trim() !== ""
    const requestedActive = body.isActive === undefined ? true : parseBoolean(body.isActive, "isActive")
    const isActive = !internalCostProvided && !customerCostProvided ? false : requestedActive

    const product = await prisma.product.create({
      data: {
        name: parseRequiredString(body.name, "name"),
        description: parseOptionalString(body.description),
        categoryId: parseRequiredString(body.categoryId, "categoryId"),
        internalCost: parseDecimalOrDefault(body.internalCost, "internalCost", 2, "0.00"),
        customerCost: parseDecimalOrDefault(body.customerCost, "customerCost", 2, "0.00"),
        laborRate: parseDecimalOrDefault(body.laborRate, "laborRate", 2, "0.00"),
        coveragePerUnit: parseDecimalOrDefault(body.coveragePerUnit, "coveragePerUnit", 4, "0.0000"),
        isActive,
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
