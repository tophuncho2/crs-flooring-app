import { NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { normalizePrismaError, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { ensureBuilderOrAdmin } from "@/server/auth/route-auth"

function normalizeWarehouseRow(warehouse: {
  id: string
  name: string
  address: string | null
  phone: string | null
  createdAt: Date
  updatedAt: Date
  _count: {
    sections: number
    locations: number
    workOrders: number
  }
}) {
  return {
    id: warehouse.id,
    name: warehouse.name,
    address: warehouse.address,
    phone: warehouse.phone,
    sectionsCount: warehouse._count.sections,
    locationsCount: warehouse._count.locations,
    workOrdersCount: warehouse._count.workOrders,
    createdAt: warehouse.createdAt.toISOString(),
    updatedAt: warehouse.updatedAt.toISOString(),
  }
}

export async function GET() {
  const authError = await ensureBuilderOrAdmin({ toolSlug: "warehouse" })
  if (authError) return authError

  try {
    const warehouses = await prisma.flooringWarehouse.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sections: true,
            locations: true,
            workOrders: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ warehouses: warehouses.map(normalizeWarehouseRow) })
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
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sections: true,
            locations: true,
            workOrders: true,
          },
        },
      },
    })

    return NextResponse.json({ warehouse: normalizeWarehouseRow(warehouse) }, { status: 201 })
  } catch (error) {
    const normalized = normalizePrismaError(error)
    return NextResponse.json({ error: normalized.message }, { status: normalized.status })
  }
}
