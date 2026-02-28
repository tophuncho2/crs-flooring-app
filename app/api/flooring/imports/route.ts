import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  normalizePrismaError,
  parseDecimalOrDefault,
  parseOptionalString,
  parseRequiredString,
} from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

const transportTypes = new Set(["TRANSFER_WAREHOUSE", "WAREHOUSE_RETURN", "PURCHASE_ORDER"])
const importStatuses = new Set(["PENDING", "SHIPPED", "RECEIVED", "FINAL"])

function parseEnum(value: unknown, field: string, allowed: Set<string>): string {
  const raw = parseRequiredString(value, field)
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, "_")
  if (!allowed.has(normalized)) {
    throw { message: `${field} must be one of ${Array.from(allowed).join(", ")}`, field }
  }
  return normalized
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const imports = await prisma.flooringImportBatch.findMany({
      include: {
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

    const importBatch = await prisma.flooringImportBatch.create({
      data: {
        warehouseId: parseOptionalString(body.warehouseId),
        importTag: parseOptionalString(body.importTag),
        transportType: parseEnum(body.transportType, "transportType", transportTypes) as
          | "TRANSFER_WAREHOUSE"
          | "WAREHOUSE_RETURN"
          | "PURCHASE_ORDER",
        status: parseEnum(body.status, "status", importStatuses) as
          | "PENDING"
          | "SHIPPED"
          | "RECEIVED"
          | "FINAL",
        totalCost: parseDecimalOrDefault(body.totalCost, "totalCost", 2, "0.00"),
        importNumber: (latest?.importNumber ?? 0) + 1,
      },
      include: {
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
