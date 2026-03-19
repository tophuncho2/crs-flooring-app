import { NextResponse } from "next/server"
import { normalizePrismaError, parseRequiredString } from "@/server/http/api-helpers"
import { normalizeUnitOfMeasureOption } from "@/server/flooring/unit-measures"
import { prisma } from "@/server/db/prisma"
import { ensureBuilderPanelAccess } from "@/server/auth/route-auth"

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
    const unitOfMeasure = await prisma.flooringUnitOfMeasure.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            sendUnitCategories: true,
            stockUnitCategories: true,
            coverageAvailableUnitCategories: true,
            itemCoverageUnitCategories: true,
            serviceUnitCategories: true,
            services: true,
            templateServiceItems: true,
            workOrderServiceItems: true,
          },
        },
      },
    })

    if (!unitOfMeasure) {
      return NextResponse.json({ error: "Unit of measure not found" }, { status: 404 })
    }

    const categoryLinks =
      unitOfMeasure._count.sendUnitCategories +
      unitOfMeasure._count.stockUnitCategories +
      unitOfMeasure._count.coverageAvailableUnitCategories +
      unitOfMeasure._count.itemCoverageUnitCategories +
      unitOfMeasure._count.serviceUnitCategories

    if (categoryLinks > 0) {
      return NextResponse.json({ error: "This unit of measure is linked to categories and cannot be deleted" }, { status: 409 })
    }

    if (
      unitOfMeasure._count.services > 0 ||
      unitOfMeasure._count.templateServiceItems > 0 ||
      unitOfMeasure._count.workOrderServiceItems > 0
    ) {
      return NextResponse.json({ error: "This unit of measure is linked and cannot be deleted" }, { status: 409 })
    }

    await prisma.flooringUnitOfMeasure.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
