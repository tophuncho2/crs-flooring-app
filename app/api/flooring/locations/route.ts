import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { prisma } from "@/server/db/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"

type LocationRow = {
  id: string
  warehouseId: string
  locationCode: string
  section: string | null
}

export async function GET(request: Request) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = parseOptionalString(searchParams.get("warehouseId"))

    const locations = (await prisma.$queryRawUnsafe(
      `
      SELECT id, "warehouseId" as "warehouseId", "locationCode" as "locationCode", section
      FROM flooring_location
      WHERE ($1::text IS NULL OR "warehouseId" = $1)
      ORDER BY "locationCode" ASC
      `,
      warehouseId,
    )) as LocationRow[]

    return NextResponse.json({
      locations: locations.map((row) => ({
        id: row.id,
        warehouseId: row.warehouseId,
        locationCode: row.locationCode,
        sectionName: row.section,
      })),
    })
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
    const warehouseId = parseRequiredString(body.warehouseId, "warehouseId")
    const locationCode = parseRequiredString(body.locationCode, "locationCode").trim()
    const sectionName = parseOptionalString(body.sectionName)

    const rows = (await prisma.$queryRawUnsafe(
      `
      INSERT INTO flooring_location (id, "warehouseId", "locationCode", section, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, now(), now())
      RETURNING id, "warehouseId" as "warehouseId", "locationCode" as "locationCode", section
      `,
      randomUUID(),
      warehouseId,
      locationCode,
      sectionName,
    )) as LocationRow[]

    const created = rows[0]

    return NextResponse.json(
      {
        location: {
          id: created.id,
          warehouseId: created.warehouseId,
          locationCode: created.locationCode,
          sectionName: created.section,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
