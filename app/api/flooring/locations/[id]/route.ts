import { NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"

type RouteContext = { params: Promise<{ id: string }> }

type LocationRow = {
  id: string
  warehouseId: string
  locationCode: string
  section: string | null
}

async function ensureRegistryTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS flooring_section_registry (
      id text PRIMARY KEY,
      "warehouseId" text NOT NULL,
      name text NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      UNIQUE ("warehouseId", name)
    )
  `)
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

    if (sectionName) {
      const existing = await prisma.flooringLocation.findUnique({
        where: { id },
        select: { warehouseId: true },
      })

      if (!existing) {
        return NextResponse.json({ error: "Location not found" }, { status: 404 })
      }

      await ensureRegistryTable()
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO flooring_section_registry (id, "warehouseId", name)
        VALUES ($1, $2, $3)
        ON CONFLICT ("warehouseId", name)
        DO NOTHING
        `,
        crypto.randomUUID(),
        existing.warehouseId,
        sectionName,
      )
    }

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
