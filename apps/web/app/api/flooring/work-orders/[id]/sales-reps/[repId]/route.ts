import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { deleteWorkOrderSalesRep, updateWorkOrderSalesRep } from "@/features/flooring/work-orders/mutations"
import { validateUpdateWorkOrderSalesRepInput } from "@/features/flooring/work-orders/validators"

type RouteContext = {
  params: Promise<{ id: string; repId: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.salesReps.write",
    limit: 80,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]/sales-reps/[repId]",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { repId } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const item = await updateWorkOrderSalesRep(repId, validateUpdateWorkOrderSalesRepInput(body))
    logRouteMutationSuccess(access, {
      message: "Work order sales rep updated",
      action: "workOrders.salesReps.update",
      route: "/api/flooring/work-orders/[id]/sales-reps/[repId]",
      entityType: "flooringWorkOrderSalesRep",
      entityId: item.id,
      details: { contactId: item.contactId },
    })
    return routeJson(access, { item })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Work order sales rep update failed",
        action: "workOrders.salesReps.update.error",
        route: "/api/flooring/work-orders/[id]/sales-reps/[repId]",
        entityType: "flooringWorkOrderSalesRep",
        entityId: repId,
      },
      error,
    )
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.salesReps.delete",
    limit: 50,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]/sales-reps/[repId]",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { repId } = await params

  try {
    await deleteWorkOrderSalesRep(repId)
    logRouteMutationSuccess(access, {
      message: "Work order sales rep deleted",
      action: "workOrders.salesReps.delete",
      route: "/api/flooring/work-orders/[id]/sales-reps/[repId]",
      entityType: "flooringWorkOrderSalesRep",
      entityId: repId,
    })
    return routeJson(access, { ok: true })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Work order sales rep deletion failed",
        action: "workOrders.salesReps.delete.error",
        route: "/api/flooring/work-orders/[id]/sales-reps/[repId]",
        entityType: "flooringWorkOrderSalesRep",
        entityId: repId,
      },
      error,
    )
    return routeError(access, error)
  }
}
