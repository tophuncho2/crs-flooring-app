import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = { params: Promise<{ id: string }> }

type LocationRow = {
  id: string
  warehouseId: string
  locationCode: string
  section: string | null
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>

    const hasLocationCode = "locationCode" in body
    const hasSectionName = "sectionName" in body
    const locationCode = hasLocationCode ? parseRequiredString(body.locationCode, "locationCode").trim() : null
    const sectionName = hasSectionName ? parseOptionalString(body.sectionName) : null

    const rows = (await prisma.$queryRawUnsafe(
      `
      UPDATE flooring_location
      SET
        "locationCode" = CASE WHEN $1::boolean THEN $2 ELSE "locationCode" END,
        section = CASE WHEN $3::boolean THEN $4 ELSE section END,
        "updatedAt" = now()
      WHERE id = $5
      RETURNING id, "warehouseId" as "warehouseId", "locationCode" as "locationCode", section
      `,
      hasLocationCode,
      locationCode,
      hasSectionName,
      sectionName,
      id,
    )) as LocationRow[]

    const updated = rows[0]
    if (!updated) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    return NextResponse.json({
      location: {
        id: updated.id,
        warehouseId: updated.warehouseId,
        locationCode: updated.locationCode,
        sectionName: updated.section,
      },
    })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
