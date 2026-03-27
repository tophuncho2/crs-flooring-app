import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import {
  getWorkOrderAutoAllocationStatusUseCase,
  requestWorkOrderAutoAllocationUseCase,
} from "@/features/flooring/work-orders/application/allocations"
import { buildWorkOrderAutoAllocationStatusResponse } from "@/features/flooring/work-orders/transport/allocations"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const run = await getWorkOrderAutoAllocationStatusUseCase(id)
    return routeJson(access, buildWorkOrderAutoAllocationStatusResponse(run))
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.autoAllocation.write",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]/auto-allocation",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const run = await withMutationTelemetry(
      access,
      {
        message: "Work order auto-allocation requested",
        action: "workOrders.autoAllocation.request",
        route: "/api/flooring/work-orders/[id]/auto-allocation",
        entityType: "flooringWorkOrder",
        entityId: id,
      },
      () =>
        requestWorkOrderAutoAllocationUseCase({
          workOrderId: id,
          triggeredByUserId: access.user.id,
          requestId: access.requestId,
        }),
    )

    return routeJson(access, buildWorkOrderAutoAllocationStatusResponse(run))
  } catch (error) {
    return routeError(access, error)
  }
}
