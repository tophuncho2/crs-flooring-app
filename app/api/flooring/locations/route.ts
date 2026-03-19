import { NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"

export async function GET(request: Request) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = parseOptionalString(searchParams.get("warehouseId"))

    const locations = await prisma.flooringLocation.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      orderBy: [{ section: { name: "asc" } }, { locationCode: "asc" }],
      select: {
        id: true,
        warehouseId: true,
        locationCode: true,
        sectionId: true,
        section: { select: { name: true } },
      },
    })

    return NextResponse.json({
      locations: locations.map((row) => ({
        id: row.id,
        warehouseId: row.warehouseId,
        locationCode: row.locationCode,
        sectionId: row.sectionId,
        sectionName: row.section?.name ?? null,
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
    const sectionId = parseRequiredString(body.sectionId, "sectionId")
    const section = await prisma.flooringSection.findUnique({
      where: { id: sectionId },
      select: { id: true, warehouseId: true, name: true },
    })

    if (!section || section.warehouseId !== warehouseId) {
      return NextResponse.json({ error: "Selected section is invalid for this warehouse" }, { status: 400 })
    }

    const created = await prisma.flooringLocation.create({
      data: {
        warehouseId,
        sectionId,
        locationCode,
      },
      select: {
        id: true,
        warehouseId: true,
        locationCode: true,
        sectionId: true,
        section: { select: { name: true } },
      },
    })

    return NextResponse.json(
      {
        location: {
          id: created.id,
          warehouseId: created.warehouseId,
          locationCode: created.locationCode,
          sectionId: created.sectionId,
          sectionName: created.section.name,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
