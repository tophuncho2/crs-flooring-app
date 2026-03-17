import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { normalizePrismaError, parseDecimal, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

function buildProductName(product: {
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Flooring Product"
}

function buildInventoryLabel(inventory: {
  itemNumber: string
  dyeLot: string
  location: { locationCode: string; warehouse: { name: string } }
}) {
  return `${inventory.location.warehouse.name} / ${inventory.location.locationCode} / Item ${inventory.itemNumber}${inventory.dyeLot ? ` / Dye ${inventory.dyeLot}` : ""}`
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const items = await prisma.flooringWorkOrderItem.findMany({
      where: { workOrderId: id },
      include: {
        product: {
          select: {
            id: true,
            manufacturerName: true,
            style: true,
            color: true,
            category: { select: { sendUnit: { select: { name: true } } } },
          },
        },
        linkedInventory: {
          select: {
            id: true,
            itemNumber: true,
            dyeLot: true,
            location: {
              select: {
                locationCode: true,
                warehouse: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: buildProductName(item.product),
        sendUnit: item.product.category.sendUnit?.name ?? "",
        quantity: item.quantity.toString(),
        notes: item.notes ?? "",
        linkedInventoryId: item.linkedInventoryId ?? "",
        linkedInventoryLabel: item.linkedInventory ? buildInventoryLabel(item.linkedInventory) : "",
        changeOrderStatus: item.changeOrderStatus ?? "SUFFICIENT",
      })),
    })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>

    const productId = parseRequiredString(body.productId, "productId")
    const quantity = parseDecimal(body.quantity, "quantity", 2)
    const notes = parseOptionalString(body.notes)
    const linkedInventoryId = parseOptionalString(body.linkedInventoryId)
    const changeOrderStatus =
      String(body.changeOrderStatus ?? "SUFFICIENT")
        .trim()
        .toUpperCase() === "SHORTAGE"
        ? "SHORTAGE"
        : "SUFFICIENT"

    await prisma.flooringWorkOrder.findUniqueOrThrow({ where: { id } })

    const created = await prisma.flooringWorkOrderItem.create({
      data: {
        workOrderId: id,
        productId,
        linkedInventoryId,
        quantity,
        notes,
        changeOrderStatus,
      },
      include: {
        product: {
          select: {
            id: true,
            manufacturerName: true,
            style: true,
            color: true,
            category: { select: { sendUnit: { select: { name: true } } } },
          },
        },
        linkedInventory: {
          select: {
            id: true,
            itemNumber: true,
            dyeLot: true,
            location: {
              select: {
                locationCode: true,
                warehouse: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    return NextResponse.json(
      {
        item: {
          id: created.id,
          productId: created.productId,
          productName: buildProductName(created.product),
          sendUnit: created.product.category.sendUnit?.name ?? "",
          quantity: created.quantity.toString(),
          notes: created.notes ?? "",
          linkedInventoryId: created.linkedInventoryId ?? "",
          linkedInventoryLabel: created.linkedInventory ? buildInventoryLabel(created.linkedInventory) : "",
          changeOrderStatus: created.changeOrderStatus ?? "SUFFICIENT",
        },
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "That inventory row is already linked to another work order item" }, { status: 409 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "The selected product or work order does not exist" }, { status: 404 })
    }

    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
