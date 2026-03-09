import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  normalizePrismaError,
  parseOptionalString,
  parseRequiredString,
} from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

const workOrderStatuses = new Set([
  "BUILDING_ORDER",
  "PENDING",
  "CARPET_CLEANING",
  "PULL_TEMPLATE",
  "MODIFY",
  "SENT_OUT",
])

const vacancyStatuses = new Set(["VACANT", "OCCUPIED"])

function parseEnumValue(value: unknown, field: string, allowed: Set<string>): string {
  const raw = parseRequiredString(value, field)
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, "_")
  if (!allowed.has(normalized)) {
    throw { message: `${field} must be one of ${Array.from(allowed).join(", ")}`, field }
  }
  return normalized
}

function parseOptionalEnumValue(value: unknown, field: string, allowed: Set<string>): string | null {
  if (value === undefined || value === null || String(value).trim() === "") return null
  return parseEnumValue(value, field, allowed)
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const workOrders = await prisma.flooringWorkOrder.findMany({
      include: {
        property: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true } },
        template: { select: { id: true, templateTag: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    })

    return NextResponse.json({ workOrders })
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

    const workOrder = await prisma.flooringWorkOrder.create({
      data: {
        propertyId: parseRequiredString(body.propertyId, "propertyId"),
        templateId: parseOptionalString(body.templateId),
        warehouseId: parseOptionalString(body.warehouseId),
        status: parseEnumValue(body.status, "status", workOrderStatuses) as
          | "BUILDING_ORDER"
          | "PENDING"
          | "CARPET_CLEANING"
          | "PULL_TEMPLATE"
          | "MODIFY"
          | "SENT_OUT",
        vacancy: parseOptionalEnumValue(body.vacancy, "vacancy", vacancyStatuses) as
          | "VACANT"
          | "OCCUPIED"
          | null,
        unitLabel: parseOptionalString(body.unitLabel),
        customAddress: parseOptionalString(body.customAddress),
        instructions: parseOptionalString(body.instructions),
        templateNotes: parseOptionalString(body.templateNotes),
        googleDriveSlip: parseOptionalString(body.googleDriveSlip),
        googleDocUrl: parseOptionalString(body.googleDocUrl),
      },
    })

    return NextResponse.json({ workOrder }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
