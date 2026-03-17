import { NextResponse } from "next/server"
import { normalizePrismaError, parseRequiredString } from "@/server/http/api-helpers"
import { normalizeUnitOfMeasureOption } from "@/server/flooring/unit-measures"
import { prisma } from "@/server/db/prisma"
import { ensureBuilderPanelAccess } from "@/server/auth/route-auth"

export async function GET() {
  const authError = await ensureBuilderPanelAccess()
  if (authError) return authError

  try {
    const unitOfMeasures = await prisma.flooringUnitOfMeasure.findMany({
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ unitOfMeasures: unitOfMeasures.map(normalizeUnitOfMeasureOption) })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}

export async function POST(request: Request) {
  const authError = await ensureBuilderPanelAccess()
  if (authError) return authError

  try {
    const body = (await request.json()) as Record<string, unknown>
    const unitOfMeasure = await prisma.flooringUnitOfMeasure.create({
      data: {
        name: parseRequiredString(body.name, "name"),
      },
    })

    return NextResponse.json({ unitOfMeasure: normalizeUnitOfMeasureOption(unitOfMeasure) }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
