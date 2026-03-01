import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  normalizePrismaError,
  parseOptionalString,
  parseRequiredString,
} from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

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

export async function GET() {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const imports = await prisma.flooringImportBatch.findMany({
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
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ imports })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const body = (await request.json()) as Record<string, unknown>

    const latest = await prisma.flooringImportBatch.findFirst({
      where: { importNumber: { not: null } },
      orderBy: { importNumber: "desc" },
      select: { importNumber: true },
    })

    const normalizedTransportType = parseEnum(body.transportType, "transportType", transportTypes)
    const normalizedStatus = parseEnum(body.status, "status", importStatuses)
    const dbTransportType = await resolveDbEnumValue("transportType", normalizedTransportType, "transportType")
    const dbStatus = await resolveDbEnumValue("status", normalizedStatus, "status")

    const importBatch = await prisma.flooringImportBatch.create({
      data: {
        warehouseId: parseOptionalString(body.warehouseId),
        importTag: parseOptionalString(body.importTag),
        transportType: dbTransportType as never,
        status: dbStatus as never,
        importNumber: (latest?.importNumber ?? 0) + 1,
      },
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

    return NextResponse.json({ importBatch }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
