import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  requireRouteAccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { deleteTemplateItem, updateTemplateItem } from "@/features/flooring/templates/mutations"
import { validateUpdateTemplateMaterialItemInput } from "@/features/flooring/templates/validators"

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "templates.items.write",
    limit: 80,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/templates/[id]/items/[itemId]",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { itemId } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const item = await updateTemplateItem(itemId, validateUpdateTemplateMaterialItemInput(body))
    logRouteMutationSuccess(access, {
      message: "Template material item updated",
      action: "templates.items.update",
      route: "/api/flooring/templates/[id]/items/[itemId]",
      entityType: "flooringTemplateItem",
      entityId: item.id,
      details: { productId: item.productId },
    })
    return routeJson(access, { item })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Template material item update failed",
        action: "templates.items.update.error",
        route: "/api/flooring/templates/[id]/items/[itemId]",
        entityType: "flooringTemplateItem",
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
    scope: "templates.items.delete",
    limit: 50,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/templates/[id]/items/[itemId]",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { itemId } = await params

  try {
    await deleteTemplateItem(itemId)
    logRouteMutationSuccess(access, {
      message: "Template material item deleted",
      action: "templates.items.delete",
      route: "/api/flooring/templates/[id]/items/[itemId]",
      entityType: "flooringTemplateItem",
      entityId: itemId,
    })
    return routeJson(access, { ok: true })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Template material item deletion failed",
        action: "templates.items.delete.error",
        route: "/api/flooring/templates/[id]/items/[itemId]",
        entityType: "flooringTemplateItem",
        entityId: itemId,
      },
      error,
    )
    return routeError(access, error)
  }
}
