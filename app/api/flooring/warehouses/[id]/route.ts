import { updateWarehouseRow } from "@/features/flooring/warehouse/api"
import { authorizeWarehouseRoute } from "@/features/flooring/shared/access/domain-tools"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"

type RouteContext = { params: Promise<{ id: string }> }

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
    const warehouse = await updateWarehouseRow(id, (await request.json()) as Record<string, unknown>)
    logRouteMutationSuccess(access, {
      message: "Warehouse updated",
      action: "warehouses.update",
      route: "/api/flooring/warehouses/[id]",
      entityType: "flooringWarehouse",
      entityId: warehouse.id,
    })

    return routeJson(access, { warehouse })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Warehouse update failed",
        action: "warehouses.update.error",
        route: "/api/flooring/warehouses/[id]",
        entityType: "flooringWarehouse",
        entityId: (await params).id,
      },
      error,
    )
    return routeError(access, error)
  }
}
