import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

function buildPadLabel(product: {
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Pad Product"
}

async function ensurePadProduct(productId: string | null) {
  if (!productId) {
    return null
  }

  const product = await prisma.flooringProduct.findFirst({
    where: {
      id: productId,
      category: {
        name: "Pad",
      },
    },
    select: { id: true },
  })

  if (!product) {
    throw { message: "padProductId must reference a Pad product", field: "padProductId" }
  }

  return product.id
}

function normalizeTemplateRow(template: {
  id: string
  templateTag: string
  instructions: string | null
  templateNotes: string | null
  propertyId: string
  property: { id: string; name: string }
  warehouse: { id: string; name: string } | null
  padProduct: { id: string; manufacturerName: string | null; style: string | null; color: string | null } | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: template.id,
    templateTag: template.templateTag,
    propertyId: template.propertyId,
    propertyName: template.property.name,
    warehouseId: template.warehouse?.id ?? "",
    warehouseName: template.warehouse?.name ?? "",
    instructions: template.instructions ?? "",
    templateNotes: template.templateNotes ?? "",
    padProductId: template.padProduct?.id ?? "",
    padTypeLabel: template.padProduct ? buildPadLabel(template.padProduct) : "",
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  }
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const templates = await prisma.flooringTemplate.findMany({
      include: {
        property: {
          select: { id: true, name: true },
        },
        warehouse: {
          select: { id: true, name: true },
        },
        padProduct: {
          select: {
            id: true,
            manufacturerName: true,
            style: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    })

    return NextResponse.json({ templates: templates.map(normalizeTemplateRow) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const body = (await request.json()) as Record<string, unknown>
    const padProductId = await ensurePadProduct(parseOptionalString(body.padProductId))

    const template = await prisma.flooringTemplate.create({
      data: {
        propertyId: parseRequiredString(body.propertyId, "propertyId"),
        templateTag: parseRequiredString(body.templateTag, "templateTag"),
        warehouseId: parseOptionalString(body.warehouseId),
        instructions: parseOptionalString(body.instructions),
        templateNotes: parseOptionalString(body.templateNotes),
        padProductId,
      },
      include: {
        property: {
          select: { id: true, name: true },
        },
        warehouse: {
          select: { id: true, name: true },
        },
        padProduct: {
          select: {
            id: true,
            manufacturerName: true,
            style: true,
            color: true,
          },
        },
      },
    })

    return NextResponse.json({ template: normalizeTemplateRow(template) }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
