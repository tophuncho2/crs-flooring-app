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

type RouteContext = {
  params: Promise<{ id: string }>
}

type ProductBody = Record<string, unknown>

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

function buildProductUpdate(body: ProductBody) {
  const data: {
    name?: string
    description?: string | null
    categoryId?: string
    internalCost?: Prisma.Decimal
    customerCost?: Prisma.Decimal
    laborRate?: Prisma.Decimal
    coveragePerUnit?: Prisma.Decimal
    isActive?: boolean
  } = {}

  if ("name" in body) data.name = parseRequiredString(body.name, "name")
  if ("description" in body) data.description = parseOptionalString(body.description)
  if ("categoryId" in body) data.categoryId = parseRequiredString(body.categoryId, "categoryId")
  if ("internalCost" in body) data.internalCost = parseDecimal(body.internalCost, "internalCost", 2)
  if ("customerCost" in body) data.customerCost = parseDecimal(body.customerCost, "customerCost", 2)
  if ("laborRate" in body) data.laborRate = parseDecimal(body.laborRate, "laborRate", 2)
  if ("coveragePerUnit" in body) {
    data.coveragePerUnit = parseDecimal(body.coveragePerUnit, "coveragePerUnit", 4)
  }
  if ("isActive" in body) data.isActive = parseBoolean(body.isActive, "isActive")

  return data
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as ProductBody
    const data = buildProductUpdate(body)

    if ("isActive" in body && data.isActive === true) {
      const existingProduct = await prisma.product.findUnique({
        where: { id },
        select: { internalCost: true, customerCost: true },
      })

      if (!existingProduct) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 })
      }

      const nextInternalCost = data.internalCost ?? existingProduct.internalCost
      const nextCustomerCost = data.customerCost ?? existingProduct.customerCost

      if (nextInternalCost.equals(0) && nextCustomerCost.equals(0)) {
        data.isActive = false
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data,
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

    return NextResponse.json({ product: toProductResponse(product) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const { id } = await params
    await prisma.product.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
