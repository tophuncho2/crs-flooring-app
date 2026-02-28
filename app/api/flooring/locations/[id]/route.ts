import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin()
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>

    const location = await prisma.flooringLocation.update({
      where: { id },
      data: {
        sectionId: "sectionId" in body ? parseOptionalString(body.sectionId) : undefined,
        locationCode: "locationCode" in body ? parseRequiredString(body.locationCode, "locationCode") : undefined,
      },
      include: { section: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ location })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
