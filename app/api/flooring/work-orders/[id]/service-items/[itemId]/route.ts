import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  requireRouteAccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { deleteWorkOrderServiceItem, updateWorkOrderServiceItem } from "@/features/flooring/work-orders/mutations"
import { validateUpdateWorkOrderServiceItemInput } from "@/features/flooring/work-orders/validators"

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.serviceItems.write",
    limit: 80,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]/service-items/[itemId]",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { itemId } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const item = await updateWorkOrderServiceItem(itemId, validateUpdateWorkOrderServiceItemInput(body))
    logRouteMutationSuccess(access, {
      message: "Work order service item updated",
      action: "workOrders.serviceItems.update",
      route: "/api/flooring/work-orders/[id]/service-items/[itemId]",
      entityType: "flooringWorkOrderServiceItem",
      entityId: item.id,
      details: { serviceId: item.serviceId ?? null, unitId: item.unitId },
    })
    return routeJson(access, { item })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Work order service item update failed",
        action: "workOrders.serviceItems.update.error",
        route: "/api/flooring/work-orders/[id]/service-items/[itemId]",
        entityType: "flooringWorkOrderServiceItem",
        entityId: itemId,
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
    scope: "workOrders.serviceItems.delete",
    limit: 50,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]/service-items/[itemId]",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { itemId } = await params

  try {
    await deleteWorkOrderServiceItem(itemId)
    logRouteMutationSuccess(access, {
      message: "Work order service item deleted",
      action: "workOrders.serviceItems.delete",
      route: "/api/flooring/work-orders/[id]/service-items/[itemId]",
      entityType: "flooringWorkOrderServiceItem",
      entityId: itemId,
    })
    return routeJson(access, { ok: true })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Work order service item deletion failed",
        action: "workOrders.serviceItems.delete.error",
        route: "/api/flooring/work-orders/[id]/service-items/[itemId]",
        entityType: "flooringWorkOrderServiceItem",
        entityId: itemId,
      },
      error,
    )
    return routeError(access, error)
  }
}
