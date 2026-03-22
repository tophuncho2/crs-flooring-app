import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  requireRouteAccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { deleteTemplateServiceItem, updateTemplateServiceItem } from "@/features/flooring/templates/mutations"
import { validateUpdateTemplateServiceItemInput } from "@/features/flooring/templates/validators"

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "templates.serviceItems.write",
    limit: 80,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/templates/[id]/service-items/[itemId]",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { itemId } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const item = await updateTemplateServiceItem(itemId, validateUpdateTemplateServiceItemInput(body))
    logRouteMutationSuccess(access, {
      message: "Template service item updated",
      action: "templates.serviceItems.update",
      route: "/api/flooring/templates/[id]/service-items/[itemId]",
      entityType: "flooringTemplateServiceItem",
      entityId: item.id,
      details: { serviceId: item.serviceId ?? null, unitId: item.unitId },
    })
    return routeJson(access, { item })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Template service item update failed",
        action: "templates.serviceItems.update.error",
        route: "/api/flooring/templates/[id]/service-items/[itemId]",
        entityType: "flooringTemplateServiceItem",
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
    scope: "templates.serviceItems.delete",
    limit: 50,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/templates/[id]/service-items/[itemId]",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { itemId } = await params

  try {
    await deleteTemplateServiceItem(itemId)
    logRouteMutationSuccess(access, {
      message: "Template service item deleted",
      action: "templates.serviceItems.delete",
      route: "/api/flooring/templates/[id]/service-items/[itemId]",
      entityType: "flooringTemplateServiceItem",
      entityId: itemId,
    })
    return routeJson(access, { ok: true })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Template service item deletion failed",
        action: "templates.serviceItems.delete.error",
        route: "/api/flooring/templates/[id]/service-items/[itemId]",
        entityType: "flooringTemplateServiceItem",
        entityId: itemId,
      },
      error,
    )
    return routeError(access, error)
  }
}
