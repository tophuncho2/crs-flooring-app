import { NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { normalizePrismaError, parseRequiredString } from "@/server/http/api-helpers"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>

    const hasLocationCode = "locationCode" in body
    const hasSectionId = "sectionId" in body
    const locationCode = hasLocationCode ? parseRequiredString(body.locationCode, "locationCode").trim() : undefined
    const sectionId = hasSectionId ? parseRequiredString(body.sectionId, "sectionId").trim() : undefined

    const existing = await prisma.flooringLocation.findUnique({
      where: { id },
      select: { warehouseId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    if (hasSectionId) {
      const section = await prisma.flooringSection.findUnique({
        where: { id: sectionId },
        select: { warehouseId: true },
      })

      if (!section || section.warehouseId !== existing.warehouseId) {
        return NextResponse.json({ error: "Selected section is invalid for this warehouse" }, { status: 400 })
      }
    }

    const updated = await prisma.flooringLocation.update({
      where: { id },
      data: {
        ...(hasLocationCode ? { locationCode } : {}),
        ...(hasSectionId ? { sectionId } : {}),
      },
      select: {
        id: true,
        warehouseId: true,
        locationCode: true,
        sectionId: true,
        section: { select: { name: true } },
      },
    })

    return NextResponse.json({
      location: {
        id: updated.id,
        warehouseId: updated.warehouseId,
        locationCode: updated.locationCode,
        sectionId: updated.sectionId,
        sectionName: updated.section?.name ?? null,
      },
    })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const location = await prisma.flooringLocation.findUnique({
      where: { id },
      select: {
        id: true,
        warehouseId: true,
        sectionId: true,
      },
    })

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 })
    }

    await prisma.flooringLocation.delete({ where: { id } })

    return NextResponse.json({
      ok: true,
      locationId: id,
      warehouseId: location.warehouseId,
      sectionId: location.sectionId,
    })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
