import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseDecimal, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

function buildProductName(product: {
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Flooring Product"
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const catalogMode = searchParams.get("catalog") === "1"
  const authError = await ensureBuilderOrAdmin({ toolSlug: catalogMode ? "products" : "warehouse" })
  if (authError) return authError

  try {
    if (catalogMode) {
      const products = await prisma.flooringProduct.findMany({
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
        orderBy: [{ category: { name: "asc" } }, { manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
      })

      return NextResponse.json({ products: products.map(normalizeCatalogProduct) })
    }

    const products = await prisma.flooringProduct.findMany({
      orderBy: [{ manufacturerName: "asc" }, { style: "asc" }, { color: "asc" }],
      select: {
        id: true,
        manufacturerName: true,
        style: true,
        color: true,
      },
    })

    return NextResponse.json({
      products: products.map((product) => ({
        id: product.id,
        name: buildProductName(product),
      })),
    })
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
    const categoryId = parseRequiredString(body.categoryId, "categoryId")
    const photoUrls = Array.isArray(body.photoUrls)
      ? body.photoUrls.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim())
      : []

    const product = await prisma.flooringProduct.create({
      data: {
        categoryId,
        manufacturerName: parseOptionalString(body.manufacturerName),
        style: parseOptionalString(body.style),
        color: parseOptionalString(body.color),
        width: parseOptionalString(body.width),
        sheetSize: parseOptionalString(body.sheetSize),
        thickness: parseOptionalString(body.thickness),
        unitWeight: parseOptionalString(body.unitWeight),
        baseColor: parseOptionalString(body.baseColor),
        coveragePerUnit:
          body.coveragePerUnit === "" || body.coveragePerUnit === null || body.coveragePerUnit === undefined
            ? null
            : parseDecimal(body.coveragePerUnit, "coveragePerUnit", 4),
        photoUrls,
        notes: parseOptionalString(body.notes),
      },
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

    return NextResponse.json({ product: normalizeCatalogProduct(product) }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
