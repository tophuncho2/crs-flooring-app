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
