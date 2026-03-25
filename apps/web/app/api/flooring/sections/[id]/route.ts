import { deleteSectionRow, updateSectionRow } from "@/features/flooring/warehouse/api"
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
    scope: "warehouse.sections.write",
    limit: 40,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/sections/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const section = await updateSectionRow(undefined, id, (await request.json()) as Record<string, unknown>)
    logRouteMutationSuccess(access, {
      message: "Warehouse section updated",
      action: "warehouse.sections.update",
      route: "/api/flooring/sections/[id]",
      entityType: "flooringSection",
      entityId: section.id,
      details: {
        warehouseId: section.warehouseId,
      },
    })

    return routeJson(access, { section })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Warehouse section update failed",
        action: "warehouse.sections.update.error",
        route: "/api/flooring/sections/[id]",
        entityType: "flooringSection",
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
    scope: "warehouse.sections.delete",
    limit: 30,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/sections/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const result = await deleteSectionRow(undefined, id)
    logRouteMutationSuccess(access, {
      message: "Warehouse section deleted",
      action: "warehouse.sections.delete",
      route: "/api/flooring/sections/[id]",
      entityType: "flooringSection",
      entityId: id,
      details: {
        warehouseId: result.warehouseId,
      },
    })

    return routeJson(access, result)
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Warehouse section deletion failed",
        action: "warehouse.sections.delete.error",
        route: "/api/flooring/sections/[id]",
        entityType: "flooringSection",
        entityId: (await params).id,
      },
      error,
    )
    return routeError(access, error)
  }
}
