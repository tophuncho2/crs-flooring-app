import { deleteWarehouseRow, getWarehouseDetailRow, updateWarehouseRow } from "@/features/flooring/warehouse/api"
import { authorizeWarehouseRoute } from "@/features/flooring/shared/access/domain-tools"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { warehouse: await getWarehouseDetailRow(id) })
  } catch (error) {
    return routeError(access, error)
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
    await updateWarehouseRow(id, (await request.json()) as Record<string, unknown>)
    const warehouse = await getWarehouseDetailRow(id)
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

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await authorizeWarehouseRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "warehouses.delete",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/warehouses/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const result = await deleteWarehouseRow(id)
    logRouteMutationSuccess(access, {
      message: "Warehouse deleted",
      action: "warehouses.delete",
      route: "/api/flooring/warehouses/[id]",
      entityType: "flooringWarehouse",
      entityId: id,
    })

    return routeJson(access, result)
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Warehouse deletion failed",
        action: "warehouses.delete.error",
        route: "/api/flooring/warehouses/[id]",
        entityType: "flooringWarehouse",
        entityId: (await params).id,
      },
      error,
    )
    return routeError(access, error)
  }
}
