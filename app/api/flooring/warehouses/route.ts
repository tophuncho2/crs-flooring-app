import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/lib/api-helpers"
import { ensureBuilderOrAdmin } from "@/lib/route-auth"

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const warehouses = await prisma.flooringWarehouse.findMany({
      include: {
        _count: {
          select: {
            locations: true,
            workOrders: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ warehouses })
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

    const warehouse = await prisma.flooringWarehouse.create({
      data: {
        name: parseRequiredString(body.name, "name"),
        address: parseOptionalString(body.address),
        phone: parseOptionalString(body.phone),
      },
      include: {
        _count: {
          select: {
            locations: true,
            workOrders: true,
          },
        },
      },
    })

    return NextResponse.json({ warehouse }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
