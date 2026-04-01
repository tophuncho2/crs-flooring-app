import { authorizeTemplatesRoute } from "@/modules/shared/access/templates-work-orders"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { deleteTemplateSalesRep, updateTemplateSalesRep } from "@/modules/templates/mutations"
import { validateUpdateTemplateSalesRepInput } from "@/modules/templates/validators"

type RouteContext = {
  params: Promise<{ id: string; repId: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "templates.salesReps.write",
    limit: 80,
    windowMs: 10 * 60 * 1000,
    route: "/api/templates/[id]/sales-reps/[repId]",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { repId } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const item = await updateTemplateSalesRep(repId, validateUpdateTemplateSalesRepInput(body))
    logRouteMutationSuccess(access, {
      message: "Template sales rep updated",
      action: "templates.salesReps.update",
      route: "/api/templates/[id]/sales-reps/[repId]",
      entityType: "flooringTemplateSalesRep",
      entityId: item.id,
      details: { contactId: item.contactId },
    })
    return routeJson(access, { item })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Template sales rep update failed",
        action: "templates.salesReps.update.error",
        route: "/api/templates/[id]/sales-reps/[repId]",
        entityType: "flooringTemplateSalesRep",
        entityId: repId,
      },
      error,
    )
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "templates.salesReps.delete",
    limit: 50,
    windowMs: 10 * 60 * 1000,
    route: "/api/templates/[id]/sales-reps/[repId]",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { repId } = await params

  try {
    await deleteTemplateSalesRep(repId)
    logRouteMutationSuccess(access, {
      message: "Template sales rep deleted",
      action: "templates.salesReps.delete",
      route: "/api/templates/[id]/sales-reps/[repId]",
      entityType: "flooringTemplateSalesRep",
      entityId: repId,
    })
    return routeJson(access, { ok: true })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Template sales rep deletion failed",
        action: "templates.salesReps.delete.error",
        route: "/api/templates/[id]/sales-reps/[repId]",
        entityType: "flooringTemplateSalesRep",
        entityId: repId,
      },
      error,
    )
    return routeError(access, error)
  }
}
