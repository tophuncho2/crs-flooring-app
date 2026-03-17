import { NextResponse } from "next/server"
import { FlooringVacancyStatus, FlooringWorkOrderStatus, Prisma } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

const workOrderStatuses = new Set([
  "BUILDING_ORDER",
  "PENDING_EXPORT",
  "CARPET_CLEANING",
  "SENT_OUT",
  "COMPLETE",
  "PENDING",
  "PULL_TEMPLATE",
  "MODIFY",
])

const vacancyStatuses = new Set(["VACANT", "OCCUPIED"])

function parseWorkOrderStatus(value: unknown, field: string): string {
  const normalized = parseRequiredString(value, field)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")

  const mapped = {
    PENDINGEXPORT: "PENDING_EXPORT",
    EXPORTPENDING: "PENDING_EXPORT",
  }[normalized] ?? normalized

  if (!workOrderStatuses.has(mapped)) {
    throw {
      message: `${field} must be one of ${Array.from(workOrderStatuses).join(", ")}`,
      field,
    }
  }

  return mapped
}

function parseOptionalWorkOrderStatus(value: unknown, field: string): string | null {
  if (value === undefined || value === null || String(value).trim() === "") return null
  return parseWorkOrderStatus(value, field)
}

function parseOptionalEnumValue(value: unknown, field: string, allowed: Set<string>): string | null {
  if (value === undefined || value === null || String(value).trim() === "") return null

  const normalized = String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")

  if (!allowed.has(normalized)) {
    throw { message: `${field} must be one of ${Array.from(allowed).join(", ")}`, field }
  }

  return normalized
}

function parseOptionalDate(value: unknown, field: string): Date | null {
  if (value === undefined || value === null || String(value).trim() === "") return null

  const parsed = new Date(String(value).trim())
  if (Number.isNaN(parsed.getTime())) {
    throw { message: `${field} must be a valid date`, field }
  }

  return parsed
}

function parseOptionalInt(value: unknown, field: string): number | null {
  if (value === undefined || value === null || String(value).trim() === "") return null

  const raw = String(value).trim()
  if (!/^-?\d+$/.test(raw)) {
    throw { message: `${field} must be a whole number`, field }
  }

  return Number(raw)
}

function normalizeAddress(value: {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}) {
  return [value.streetAddress, value.city, value.state, value.postalCode].filter(Boolean).join(", ")
}

function buildProductName(product: {
  manufacturerName: string | null
  style: string | null
  color: string | null
}) {
  return [product.manufacturerName, product.style, product.color].filter(Boolean).join(" - ") || "Flooring Product"
}

function toClient(workOrder: {
  id: string
  property: { id: string; name: string; streetAddress: string | null; city: string | null; state: string | null; postalCode: string | null }
  warehouse: { id: string; name: string } | null
  propertyId: string
  status: string
  vacancy: "VACANT" | "OCCUPIED" | null
  scheduledFor: Date | null
  unitLabel: string | null
  unitNumber: number | null
  unitType: string | null
  customAddress: string | null
  instructions: string | null
  notes: string | null
  googleDriveSlip: string | null
  googleDocUrl: string | null
  items: Array<{
    id: string
    productId: string
    quantity: { toString: () => string }
    notes: string | null
    product: {
      id: string
      manufacturerName: string | null
      style: string | null
      color: string | null
    }
  }>
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: workOrder.id,
    propertyId: workOrder.propertyId,
    propertyName: workOrder.property.name,
    propertyAddress: normalizeAddress(workOrder.property),
    warehouseId: workOrder.warehouse?.id ?? "",
    warehouseName: workOrder.warehouse?.name ?? "",
    status: workOrder.status,
    vacancy: workOrder.vacancy,
    date: workOrder.scheduledFor?.toISOString() ?? null,
    unitText: workOrder.unitLabel ?? "",
    unitNumber: workOrder.unitNumber === null ? "" : String(workOrder.unitNumber),
    unitType: workOrder.unitType ?? "",
    customAddress: workOrder.customAddress ?? "",
    instructions: workOrder.instructions ?? "",
    notes: workOrder.notes ?? "",
    workOrderImageUrl: workOrder.googleDriveSlip ?? "",
    unitDoc: workOrder.googleDocUrl ?? "",
    items: workOrder.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity.toString(),
      notes: item.notes ?? "",
      productName: buildProductName(item.product),
    })),
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const workOrder = await prisma.flooringWorkOrder.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            streetAddress: true,
            city: true,
            state: true,
            postalCode: true,
          },
        },
        warehouse: { select: { id: true, name: true } },
        items: {
          orderBy: { createdAt: "desc" },
          include: {
            product: {
              select: {
                id: true,
                manufacturerName: true,
                style: true,
                color: true,
              },
            },
          },
        },
      },
    })

    if (!workOrder) {
      return NextResponse.json({ error: "Work order not found" }, { status: 404 })
    }

    return NextResponse.json({ workOrder: toClient(workOrder) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>

    const data: Prisma.FlooringWorkOrderUncheckedUpdateInput = {}

    if ("propertyId" in body) data.propertyId = parseRequiredString(body.propertyId, "propertyId")
    if ("templateId" in body) data.templateId = parseOptionalString(body.templateId)
    if ("warehouseId" in body) data.warehouseId = parseOptionalString(body.warehouseId)
    if ("status" in body) data.status = parseWorkOrderStatus(body.status, "status") as FlooringWorkOrderStatus
    if ("vacancy" in body) data.vacancy = parseOptionalEnumValue(body.vacancy, "vacancy", vacancyStatuses) as FlooringVacancyStatus | null
    if ("date" in body) data.scheduledFor = parseOptionalDate(body.date, "date")
    if ("unitText" in body) data.unitLabel = parseOptionalString(body.unitText)
    if ("unitNumber" in body) data.unitNumber = parseOptionalInt(body.unitNumber, "unitNumber")
    if ("unitType" in body) data.unitType = parseOptionalString(body.unitType)
    if ("customAddress" in body) data.customAddress = parseOptionalString(body.customAddress)
    if ("instructions" in body) data.instructions = parseOptionalString(body.instructions)
    if ("notes" in body) data.notes = parseOptionalString(body.notes)
    if ("workOrderImageUrl" in body) data.googleDriveSlip = parseOptionalString(body.workOrderImageUrl)
    if ("googleDocUrl" in body) data.googleDocUrl = parseOptionalString(body.googleDocUrl)

    const workOrder = await prisma.flooringWorkOrder.update({
      where: { id },
      data,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            streetAddress: true,
            city: true,
            state: true,
            postalCode: true,
          },
        },
        warehouse: {
          select: { id: true, name: true },
        },
        _count: {
          select: { items: true },
        },
      },
    })

    const itemCount = await prisma.flooringWorkOrderItem.count({ where: { workOrderId: workOrder.id } })

    return NextResponse.json({
      workOrder: {
        id: workOrder.id,
        propertyId: workOrder.propertyId,
        propertyName: workOrder.property.name,
        propertyAddress: normalizeAddress(workOrder.property),
        warehouseId: workOrder.warehouse?.id ?? "",
        warehouseName: workOrder.warehouse?.name ?? "",
        status: workOrder.status,
        vacancy: workOrder.vacancy,
        date: workOrder.scheduledFor?.toISOString() ?? null,
        unitText: workOrder.unitLabel ?? "",
        unitNumber: workOrder.unitNumber === null ? "" : String(workOrder.unitNumber),
        unitType: workOrder.unitType ?? "",
        customAddress: workOrder.customAddress ?? "",
        instructions: workOrder.instructions ?? "",
        notes: workOrder.notes ?? "",
        workOrderImageUrl: workOrder.googleDriveSlip ?? "",
        unitDoc: workOrder.googleDocUrl ?? "",
        itemsCount: itemCount,
        createdAt: workOrder.createdAt.toISOString(),
        updatedAt: workOrder.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    await prisma.flooringWorkOrder.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
