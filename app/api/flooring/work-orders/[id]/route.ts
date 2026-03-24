import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { deleteWorkOrderUseCase, updateWorkOrderUseCase } from "@/features/flooring/work-orders/application/manage-work-order"
import { getWorkOrderById } from "@/features/flooring/work-orders/queries"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { workOrder: await getWorkOrderById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.update",
    limit: 60,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const workOrder = await withMutationTelemetry(
      access,
      {
        message: "Work order updated",
        action: "workOrders.update",
        route: "/api/flooring/work-orders/[id]",
        entityType: "flooringWorkOrder",
        entityId: id,
      },
      () => updateWorkOrderUseCase(id, body),
    )
    return routeJson(access, { workOrder })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.delete",
    limit: 30,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    await withMutationTelemetry(
      access,
      {
        message: "Work order deleted",
        action: "workOrders.delete",
        route: "/api/flooring/work-orders/[id]",
        entityType: "flooringWorkOrder",
        entityId: id,
      },
      () => deleteWorkOrderUseCase(id),
    )
    return routeJson(access, { ok: true })
  } catch (error) {
    return routeError(access, error)
  }
}
