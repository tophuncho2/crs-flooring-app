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
    const name = parseRequiredString(body.name, "name").trim()
    const updated = await prisma.flooringSection.update({
      where: { id },
      data: { name },
      select: {
        id: true,
        warehouseId: true,
        name: true,
        _count: { select: { locations: true } },
      },
    })

    return NextResponse.json({
      section: {
        id: updated.id,
        warehouseId: updated.warehouseId,
        name: updated.name,
        locationsCount: updated._count.locations,
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
    const section = await prisma.flooringSection.findUnique({
      where: { id },
      select: {
        id: true,
        warehouseId: true,
        _count: {
          select: {
            locations: true,
          },
        },
      },
    })

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 })
    }

    if (section._count.locations > 0) {
      return NextResponse.json({ error: "Section cannot be deleted while locations are linked to it" }, { status: 409 })
    }

    await prisma.flooringSection.delete({ where: { id } })

    return NextResponse.json({
      ok: true,
      sectionId: id,
      warehouseId: section.warehouseId,
    })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
