import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseDecimal, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = { params: Promise<{ id: string }> }

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
      totalCost?: ReturnType<typeof parseDecimal>
    } = {}

    if ("warehouseId" in body) data.warehouseId = parseOptionalString(body.warehouseId)
    if ("importTag" in body) data.importTag = parseOptionalString(body.importTag)
    if ("transportType" in body) {
      data.transportType = parseEnum(body.transportType, "transportType", transportTypes) as
        | "TRANSFER_WAREHOUSE"
        | "WAREHOUSE_RETURN"
        | "PURCHASE_ORDER"
    }
    if ("status" in body) {
      data.status = parseEnum(body.status, "status", importStatuses) as
        | "PENDING"
        | "SHIPPED"
        | "RECEIVED"
        | "FINAL"
    }
    if ("totalCost" in body) data.totalCost = parseDecimal(body.totalCost, "totalCost", 2)

    const importBatch = await prisma.flooringImportBatch.update({
      where: { id },
      data,
      include: {
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
