import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

const importStatusOptions = new Set(["PENDING", "FINAL"])
const transportTypeOptions = new Set(["RETURN", "PURCHASE_ORDER"])

function parseImportStatus(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")

  if (!importStatusOptions.has(normalized)) {
    throw { message: `status must be one of ${Array.from(importStatusOptions).join(", ")}`, field: "status" }
  }

  return normalized
}

function parseTransportType(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")

  if (!transportTypeOptions.has(normalized)) {
    throw { message: `transportType must be one of ${Array.from(transportTypeOptions).join(", ")}`, field: "transportType" }
  }

  return normalized
}

function normalizeImportEntry(entry: {
  id: string
  importNumber: number
  orderNumber: string | null
  tag: string | null
  transportType: string
  status: string
  notes: string | null
  warehouseId: string | null
  warehouse: { id: string; name: string } | null
  createdAt: Date
  updatedAt: Date
  _count: { inventories: number }
}) {
  return {
    id: entry.id,
    importNumber: entry.importNumber,
    orderNumber: entry.orderNumber ?? "",
    tag: entry.tag ?? "",
    transportType: entry.transportType,
    status: entry.status,
    notes: entry.notes ?? "",
    warehouseId: entry.warehouseId ?? "",
    warehouseName: entry.warehouse?.name ?? "",
    itemsCount: entry._count.inventories,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const entry = await prisma.flooringImportEntry.update({
      where: { id },
      data: {
        orderNumber: parseOptionalString(body.orderNumber),
        tag: parseOptionalString(body.tag),
        transportType: parseTransportType(body.transportType),
        status: parseImportStatus(body.status),
        notes: parseOptionalString(body.notes),
        warehouseId: parseOptionalString(body.warehouseId),
      },
      include: {
        warehouse: { select: { id: true, name: true } },
        _count: { select: { inventories: true } },
      },
    })

    return NextResponse.json({ import: normalizeImportEntry(entry) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await context.params
    await prisma.flooringImportEntry.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
