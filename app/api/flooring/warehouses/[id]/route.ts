import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const data: { name?: string; address?: string | null; phone?: string | null } = {}

    if ("name" in body) data.name = parseRequiredString(body.name, "name")
    if ("address" in body) data.address = parseOptionalString(body.address)
    if ("phone" in body) data.phone = parseOptionalString(body.phone)

    const warehouse = await prisma.flooringWarehouse.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            locations: true,
            workOrders: true,
          },
        },
      },
    })

    return NextResponse.json({ warehouse })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
