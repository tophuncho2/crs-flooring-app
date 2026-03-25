import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { createWorkOrderSalesRep } from "@/features/flooring/work-orders/mutations"
import { listWorkOrderSalesReps } from "@/features/flooring/work-orders/queries"
import { validateWorkOrderSalesRepInput } from "@/features/flooring/work-orders/validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { items: await listWorkOrderSalesReps(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.salesReps.write",
    limit: 80,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]/sales-reps",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { id } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const item = await createWorkOrderSalesRep(id, validateWorkOrderSalesRepInput(body))
    logRouteMutationSuccess(access, {
      message: "Work order sales rep created",
      action: "workOrders.salesReps.create",
      route: "/api/flooring/work-orders/[id]/sales-reps",
      entityType: "flooringWorkOrderSalesRep",
      entityId: item.id,
      details: { workOrderId: id, contactId: item.contactId },
    })
    return routeJson(access, { item }, { status: 201 })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Work order sales rep creation failed",
        action: "workOrders.salesReps.create.error",
        route: "/api/flooring/work-orders/[id]/sales-reps",
        entityType: "flooringWorkOrderSalesRep",
        details: { workOrderId: id },
      },
      error,
    )
    return routeError(access, error)
  }
}
