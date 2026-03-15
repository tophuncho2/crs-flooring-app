import { NextResponse } from "next/server"
import { normalizePrismaError, parseRequiredString } from "@/lib/api-helpers"
import { normalizeUnitOfMeasureOption } from "@/lib/flooring-unit-measures"
import { prisma } from "@/lib/prisma"
import { ensureBuilderPanelAccess } from "@/lib/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const authError = await ensureBuilderPanelAccess()
  if (authError) return authError

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const unitOfMeasure = await prisma.flooringUnitOfMeasure.update({
      where: { id },
      data: {
        name: parseRequiredString(body.name, "name"),
      },
    })

    return NextResponse.json({ unitOfMeasure: normalizeUnitOfMeasureOption(unitOfMeasure) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authError = await ensureBuilderPanelAccess()
  if (authError) return authError

  try {
    const { id } = await context.params
    await prisma.flooringUnitOfMeasure.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
