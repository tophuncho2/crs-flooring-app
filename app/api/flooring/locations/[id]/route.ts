import { prisma } from "@/server/db/prisma"
import { deleteLocationRow, updateLocationRow } from "@/features/flooring/warehouse/api"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  requireRouteAccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "warehouse.locations.write",
    limit: 60,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/locations/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const location = await updateLocationRow(prisma, id, (await request.json()) as Record<string, unknown>)
    logRouteMutationSuccess(access, {
      message: "Warehouse location updated",
      action: "warehouse.locations.update",
      route: "/api/flooring/locations/[id]",
      entityType: "flooringLocation",
      entityId: location.id,
      details: {
        warehouseId: location.warehouseId,
        sectionId: location.sectionId,
      },
    })

    return routeJson(access, { location })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Warehouse location update failed",
        action: "warehouse.locations.update.error",
        route: "/api/flooring/locations/[id]",
        entityType: "flooringLocation",
        entityId: (await params).id,
      },
      error,
    )
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "warehouse.locations.delete",
    limit: 40,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/locations/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const result = await deleteLocationRow(prisma, id)
    logRouteMutationSuccess(access, {
      message: "Warehouse location deleted",
      action: "warehouse.locations.delete",
      route: "/api/flooring/locations/[id]",
      entityType: "flooringLocation",
      entityId: id,
      details: {
        warehouseId: result.warehouseId,
        sectionId: result.sectionId,
      },
    })

    return routeJson(access, result)
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Warehouse location deletion failed",
        action: "warehouse.locations.delete.error",
        route: "/api/flooring/locations/[id]",
        entityType: "flooringLocation",
        entityId: (await params).id,
      },
      error,
    )
    return routeError(access, error)
  }
}
