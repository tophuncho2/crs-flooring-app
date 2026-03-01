import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = { params: Promise<{ id: string }> }

const transportTypes = new Set(["TRANSFER_WAREHOUSE", "WAREHOUSE_RETURN", "PURCHASE_ORDER"])
const importStatuses = new Set(["PENDING", "SHIPPED", "RECEIVED", "FINAL"])

function normalizeEnumToken(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_")
}

function parseEnum(value: unknown, field: string, allowed: Set<string>): string {
  const raw = parseRequiredString(value, field)
  const normalized = normalizeEnumToken(raw)
  if (!allowed.has(normalized)) {
    throw { message: `${field} must be one of ${Array.from(allowed).join(", ")}`, field }
  }
  return normalized
}

async function resolveDbEnumValue(columnName: "status" | "transportType", normalizedValue: string, field: string) {
  const rows = (await prisma.$queryRawUnsafe(
    `
    SELECT e.enumlabel
    FROM information_schema.columns c
    JOIN pg_type t
      ON t.typname = c.udt_name
    JOIN pg_namespace n
      ON n.oid = t.typnamespace
    JOIN pg_enum e
      ON e.enumtypid = t.oid
    WHERE c.table_schema = 'public'
      AND c.table_name = 'flooring_import_batch'
      AND c.column_name = $1
      AND n.nspname = 'public'
    ORDER BY e.enumsortorder
    `,
    columnName,
  )) as Array<{ enumlabel: string }>

  if (rows.length === 0) return normalizedValue

  const match = rows.find((row) => normalizeEnumToken(row.enumlabel) === normalizedValue)
  if (!match) {
    throw { message: `${field} must match database enum value`, field }
  }

  return match.enumlabel
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>

    const data: {
      warehouseId?: string | null
      importTag?: string | null
      transportType?: "TRANSFER_WAREHOUSE" | "WAREHOUSE_RETURN" | "PURCHASE_ORDER"
      status?: "PENDING" | "SHIPPED" | "RECEIVED" | "FINAL"
    } = {}

    if ("warehouseId" in body) data.warehouseId = parseOptionalString(body.warehouseId)
    if ("importTag" in body) data.importTag = parseOptionalString(body.importTag)
    if ("transportType" in body) {
      const normalizedTransportType = parseEnum(body.transportType, "transportType", transportTypes)
      data.transportType = (await resolveDbEnumValue("transportType", normalizedTransportType, "transportType")) as
        | "TRANSFER_WAREHOUSE"
        | "WAREHOUSE_RETURN"
        | "PURCHASE_ORDER"
    }
    if ("status" in body) {
      const normalizedStatus = parseEnum(body.status, "status", importStatuses)
      data.status = (await resolveDbEnumValue("status", normalizedStatus, "status")) as
        | "PENDING"
        | "SHIPPED"
        | "RECEIVED"
        | "FINAL"
    }

    const importBatch = await prisma.flooringImportBatch.update({
      where: { id },
      data,
      select: {
        id: true,
        importNumber: true,
        importTag: true,
        transportType: true,
        status: true,
        warehouseId: true,
        createdAt: true,
        warehouse: { select: { id: true, name: true } },
        _count: { select: { inventory: true } },
      },
    })

    return NextResponse.json({ importBatch })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
