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

    const sections = await prisma.flooringSection.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        warehouseId: true,
        name: true,
        _count: { select: { locations: true } },
      },
    })

    return NextResponse.json({
      sections: sections.map((section) => ({
        id: section.id,
        warehouseId: section.warehouseId,
        name: section.name,
        locationsCount: section._count.locations,
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
    const name = parseRequiredString(body.name, "name").trim()

    const created = await prisma.flooringSection.create({
      data: { warehouseId, name },
      select: {
        id: true,
        warehouseId: true,
        name: true,
        _count: { select: { locations: true } },
      },
    })

    return NextResponse.json(
      {
        section: {
          id: created.id,
          warehouseId: created.warehouseId,
          name: created.name,
          locationsCount: created._count.locations,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
