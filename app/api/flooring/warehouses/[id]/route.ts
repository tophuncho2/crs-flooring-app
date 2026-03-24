import { prisma } from "@/server/db/prisma"
import { parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { authorizeWarehouseRoute } from "@/features/flooring/shared/access/domain-tools"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = { params: Promise<{ id: string }> }

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

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "warehouses.write",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/warehouses/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

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

    return routeJson(access, { warehouse: normalizeWarehouseRow(warehouse) })
  } catch (error) {
    return routeError(access, error)
  }
}
