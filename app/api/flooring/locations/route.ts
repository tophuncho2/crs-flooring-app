import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

export async function GET(request: Request) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const warehouseId = searchParams.get("warehouseId")

    const locations = await prisma.flooringLocation.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      include: { section: { select: { id: true, name: true } } },
      orderBy: { locationCode: "asc" },
    })

    return NextResponse.json({ locations })
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

    const location = await prisma.flooringLocation.create({
      data: {
        warehouseId: parseRequiredString(body.warehouseId, "warehouseId"),
        sectionId: parseOptionalString(body.sectionId),
        locationCode: parseRequiredString(body.locationCode, "locationCode"),
      },
      include: { section: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ location }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
