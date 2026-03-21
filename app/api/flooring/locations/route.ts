import { prisma } from "@/server/db/prisma"
import { createLocationRow, listLocationRows, parseWarehouseFilter } from "@/features/flooring/warehouse/api"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  requireRouteAccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  try {
    const { searchParams } = new URL(request.url)
    return routeJson(access, { locations: await listLocationRows(prisma, parseWarehouseFilter(searchParams.get("warehouseId"))) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "warehouse.locations.write",
    limit: 60,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/locations",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const location = await createLocationRow(prisma, (await request.json()) as Record<string, unknown>)
    logRouteMutationSuccess(access, {
      message: "Warehouse location created",
      action: "warehouse.locations.create",
      route: "/api/flooring/locations",
      entityType: "flooringLocation",
      entityId: location.id,
      details: {
        warehouseId: location.warehouseId,
        sectionId: location.sectionId,
      },
    })

    return routeJson(access, { location }, { status: 201 })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Warehouse location creation failed",
        action: "warehouse.locations.create.error",
        route: "/api/flooring/locations",
        entityType: "flooringLocation",
      },
      error,
    )
    return routeError(access, error)
  }
}
