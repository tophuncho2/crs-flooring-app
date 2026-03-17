import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { flooringCategoryUnitInclude, normalizeCategoryUnitValues } from "@/server/flooring/unit-measures"
import { prisma } from "@/server/db/prisma"
import { normalizePrismaError, parseDecimal, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"

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
  manufacturerId: string | null
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
    sendUnit: { id: string; name: string } | null
    stockUnit: { id: string; name: string } | null
    coverageAvailableUnit: { id: string; name: string } | null
    itemCoverageUnit: { id: string; name: string } | null
  }
  manufacturer: {
    id: string
    name: string
    companyName: string | null
    website: string | null
  } | null
}) {
  return {
    id: product.id,
    name: product.name,
    categoryId: product.categoryId,
    manufacturerId: product.manufacturerId ?? "",
    manufacturerName: product.manufacturer?.companyName ?? product.manufacturer?.name ?? product.manufacturerName ?? "",
    style: product.style ?? "",
    color: product.color ?? "",
    width: product.width ?? "",
    sheetSize: product.sheetSize ?? "",
    thickness: product.thickness ?? "",
    unitWeight: product.unitWeight ?? "",
    baseColor: product.baseColor ?? "",
    coveragePerUnit: product.coveragePerUnit?.toString() ?? "",
    coverageUnit: product.category.itemCoverageUnit?.name ?? "",
    photoUrls: product.photoUrls,
    notes: product.notes ?? "",
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    category: {
      id: product.category.id,
      name: product.category.name,
      ...normalizeCategoryUnitValues(product.category),
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
              ...flooringCategoryUnitInclude,
            },
          },
          manufacturer: {
            select: {
              id: true,
              name: true,
              companyName: true,
              website: true,
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
    const manufacturerId = parseOptionalString(body.manufacturerId)
    const photoUrls = Array.isArray(body.photoUrls)
      ? body.photoUrls.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim())
      : []
    const manufacturer = manufacturerId
      ? await prisma.flooringManufacturer.findUnique({
          where: { id: manufacturerId },
          select: { companyName: true, name: true },
        })
      : null
    const manufacturerName = manufacturer?.companyName ?? manufacturer?.name ?? null
    const style = parseOptionalString(body.style)
    const color = parseOptionalString(body.color)

    const product = await prisma.flooringProduct.create({
      data: {
        name: buildProductName({ manufacturerName, style, color }),
        categoryId,
        manufacturerId,
        manufacturerName,
        style,
        color,
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
            ...flooringCategoryUnitInclude,
          },
        },
        manufacturer: {
          select: {
            id: true,
            name: true,
            companyName: true,
            website: true,
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
