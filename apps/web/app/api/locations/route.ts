import { createLocationRow, listLocationRows, parseWarehouseFilter } from "@/modules/warehouse/api"
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
    return routeJson(access, { locations: await listLocationRows(undefined, parseWarehouseFilter(searchParams.get("warehouseId"))) })
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
    route: "/api/locations",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const location = await createLocationRow(undefined, (await request.json()) as Record<string, unknown>)
    logRouteMutationSuccess(access, {
      message: "Warehouse location created",
      action: "warehouse.locations.create",
      route: "/api/locations",
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
        route: "/api/locations",
        entityType: "flooringLocation",
      },
      error,
    )
    return routeError(access, error)
  }
}
