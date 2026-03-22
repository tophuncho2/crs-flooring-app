import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  requireRouteAccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { createWorkOrderServiceItem } from "@/features/flooring/work-orders/mutations"
import { listWorkOrderServiceItems } from "@/features/flooring/work-orders/queries"
import { validateWorkOrderServiceItemInput } from "@/features/flooring/work-orders/validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { items: await listWorkOrderServiceItems(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.serviceItems.write",
    limit: 80,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]/service-items",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { id } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const item = await createWorkOrderServiceItem(id, validateWorkOrderServiceItemInput(body))
    logRouteMutationSuccess(access, {
      message: "Work order service item created",
      action: "workOrders.serviceItems.create",
      route: "/api/flooring/work-orders/[id]/service-items",
      entityType: "flooringWorkOrderServiceItem",
      entityId: item.id,
      details: { workOrderId: id, serviceId: item.serviceId ?? null, unitId: item.unitId },
    })
    return routeJson(access, { item }, { status: 201 })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Work order service item creation failed",
        action: "workOrders.serviceItems.create.error",
        route: "/api/flooring/work-orders/[id]/service-items",
        entityType: "flooringWorkOrderServiceItem",
        details: { workOrderId: id },
      },
      error,
    )
    return routeError(access, error)
  }
}
