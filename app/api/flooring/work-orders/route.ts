import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

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

const workOrderStatusLabels: Record<string, string> = {
  BUILDING_ORDER: "Building Order",
  PENDING_EXPORT: "Pending Export",
  CARPET_CLEANING: "Carpet Cleaning",
  SENT_OUT: "Sent Out",
  COMPLETE: "Complete",
  PENDING: "Pending Export",
  PULL_TEMPLATE: "Pending Export",
  MODIFY: "Complete",
}

function normalizeAddress(value: { streetAddress: string | null; city: string | null; state: string | null; postalCode: string | null }) {
  return [value.streetAddress, value.city, value.state, value.postalCode].filter(Boolean).join(", ")
}

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

function normalizeWorkOrderRow(workOrder: {
  id: string
  propertyId: string
  property: { id: string; name: string; streetAddress: string | null; city: string | null; state: string | null; postalCode: string | null }
  warehouse: { id: string; name: string } | null
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
  createdAt: Date
  updatedAt: Date
  _count: { items: number }
}) {
  return {
    id: workOrder.id,
    propertyId: workOrder.propertyId,
    propertyName: workOrder.property.name,
    propertyAddress: normalizeAddress(workOrder.property),
    warehouseId: workOrder.warehouse?.id ?? "",
    warehouseName: workOrder.warehouse?.name ?? "",
    status: workOrder.status,
    statusLabel: workOrderStatusLabels[workOrder.status] ?? workOrder.status,
    vacancy: workOrder.vacancy,
    date: workOrder.scheduledFor?.toISOString() ?? null,
    unitText: workOrder.unitLabel ?? "",
    unitNumber: workOrder.unitNumber === null ? "" : String(workOrder.unitNumber),
    unitType: workOrder.unitType ?? "",
    customAddress: workOrder.customAddress ?? "",
    instructions: workOrder.instructions ?? "",
    notes: workOrder.notes ?? "",
    workOrderImageUrl: workOrder.googleDriveSlip ?? "",
    itemsCount: workOrder._count.items,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
  }
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const workOrders = await prisma.flooringWorkOrder.findMany({
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
      orderBy: { createdAt: "desc" },
      take: 250,
    })

    return NextResponse.json({ workOrders: workOrders.map(normalizeWorkOrderRow) })
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

    const propertyId = parseRequiredString(body.propertyId, "propertyId")

    const workOrder = await prisma.flooringWorkOrder.create({
      data: {
        propertyId,
        templateId: parseOptionalString(body.templateId),
        warehouseId: parseOptionalString(body.warehouseId),
        status: parseWorkOrderStatus(body.status, "status") as
          | "BUILDING_ORDER"
          | "PENDING_EXPORT"
          | "CARPET_CLEANING"
          | "SENT_OUT"
          | "COMPLETE"
          | "PENDING"
          | "PULL_TEMPLATE"
          | "MODIFY",
        vacancy: parseOptionalEnumValue(body.vacancy, "vacancy", vacancyStatuses) as
          | "VACANT"
          | "OCCUPIED"
          | null,
        scheduledFor: parseOptionalDate(body.date, "date"),
        unitLabel: parseOptionalString(body.unitText),
        unitNumber: parseOptionalInt(body.unitNumber, "unitNumber"),
        unitType: parseOptionalString(body.unitType),
        customAddress: parseOptionalString(body.customAddress),
        instructions: parseOptionalString(body.instructions),
        notes: parseOptionalString(body.notes),
        googleDriveSlip: parseOptionalString(body.workOrderImageUrl),
        googleDocUrl: parseOptionalString(body.googleDocUrl),
      },
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

    return NextResponse.json({ workOrder: normalizeWorkOrderRow(workOrder) }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
