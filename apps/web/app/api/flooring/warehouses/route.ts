import { createWarehouseRow, listWarehouseRows } from "@/features/flooring/warehouse/api"
import { authorizeWarehouseRoute } from "@/features/flooring/shared/access/domain-tools"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  try {
    return routeJson(access, { warehouses: await listWarehouseRows() })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "warehouses.write",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/warehouses",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const warehouse = await createWarehouseRow((await request.json()) as Record<string, unknown>)
    logRouteMutationSuccess(access, {
      message: "Warehouse created",
      action: "warehouses.create",
      route: "/api/flooring/warehouses",
      entityType: "flooringWarehouse",
      entityId: warehouse.id,
    })

    return routeJson(access, { warehouse }, { status: 201 })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Warehouse creation failed",
        action: "warehouses.create.error",
        route: "/api/flooring/warehouses",
        entityType: "flooringWarehouse",
      },
      error,
    )
    return routeError(access, error)
  }
}
