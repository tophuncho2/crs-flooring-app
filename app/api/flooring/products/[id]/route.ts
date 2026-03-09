import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseDecimal, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

function normalizeCatalogProduct(product: {
  id: string
  name: string
  categoryId: string
  manufacturerName: string | null
  style: string | null
  color: string | null
  width: string | null
  sheetSize: string | null
  thickness: string | null
  unitWeight: string | null
  baseColor: string | null
  coveragePerUnit: Prisma.Decimal | null
  photoUrls: string[]
  notes: string | null
  createdAt: Date
  updatedAt: Date
  category: {
    id: string
    name: string
    sendUnit: string | null
    stockUnit: string | null
    coverageAvailableUnit: string | null
    itemCoverageUnit: string | null
  }
}) {
  return {
    id: product.id,
    name: product.name,
    categoryId: product.categoryId,
    manufacturerName: product.manufacturerName ?? "",
    style: product.style ?? "",
    color: product.color ?? "",
    width: product.width ?? "",
    sheetSize: product.sheetSize ?? "",
    thickness: product.thickness ?? "",
    unitWeight: product.unitWeight ?? "",
    baseColor: product.baseColor ?? "",
    coveragePerUnit: product.coveragePerUnit?.toString() ?? "",
    coverageUnit: product.category.itemCoverageUnit ?? "",
    photoUrls: product.photoUrls,
    notes: product.notes ?? "",
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    category: {
      id: product.category.id,
      name: product.category.name,
      sendUnit: product.category.sendUnit ?? "",
      stockUnit: product.category.stockUnit ?? "",
      coverageAvailableUnit: product.category.coverageAvailableUnit ?? "",
      itemCoverageUnit: product.category.itemCoverageUnit ?? "",
    },
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "products" })
  if (authError) return authError

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const data: {
      categoryId?: string
      manufacturerName?: string | null
      style?: string | null
      color?: string | null
      width?: string | null
      sheetSize?: string | null
      thickness?: string | null
      unitWeight?: string | null
      baseColor?: string | null
      coveragePerUnit?: Prisma.Decimal | null
      photoUrls?: string[]
      notes?: string | null
    } = {}

    if ("categoryId" in body) data.categoryId = parseRequiredString(body.categoryId, "categoryId")
    if ("manufacturerName" in body) data.manufacturerName = parseOptionalString(body.manufacturerName)
    if ("style" in body) data.style = parseOptionalString(body.style)
    if ("color" in body) data.color = parseOptionalString(body.color)
    if ("width" in body) data.width = parseOptionalString(body.width)
    if ("sheetSize" in body) data.sheetSize = parseOptionalString(body.sheetSize)
    if ("thickness" in body) data.thickness = parseOptionalString(body.thickness)
    if ("unitWeight" in body) data.unitWeight = parseOptionalString(body.unitWeight)
    if ("baseColor" in body) data.baseColor = parseOptionalString(body.baseColor)
    if ("coveragePerUnit" in body) {
      data.coveragePerUnit =
        body.coveragePerUnit === "" || body.coveragePerUnit === null || body.coveragePerUnit === undefined
          ? null
          : parseDecimal(body.coveragePerUnit, "coveragePerUnit", 4)
    }
    if ("photoUrls" in body) {
      data.photoUrls = Array.isArray(body.photoUrls)
        ? body.photoUrls.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim())
        : []
    }
    if ("notes" in body) data.notes = parseOptionalString(body.notes)

    const product = await prisma.flooringProduct.update({
      where: { id },
      data,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            sendUnit: true,
            stockUnit: true,
            coverageAvailableUnit: true,
            itemCoverageUnit: true,
          },
        },
      },
    })

    return NextResponse.json({ product: normalizeCatalogProduct(product) })
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
    await prisma.flooringProduct.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
