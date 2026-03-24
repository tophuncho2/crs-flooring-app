import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { createWorkOrderUseCase } from "@/features/flooring/work-orders/application/manage-work-order"
import { listWorkOrders } from "@/features/flooring/work-orders/queries"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  try {
    return routeJson(access, {
      workOrders: await listWorkOrders(undefined, {
        searchQuery: "",
        isAscendingSort: true,
        isGroupingEnabled: false,
        groupByKeys: [],
      }),
    })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.create",
    limit: 50,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = (await request.json()) as Record<string, unknown>
    const workOrder = await withMutationTelemetry(
      access,
      {
        message: "Work order created",
        action: "workOrders.create",
        route: "/api/flooring/work-orders",
        entityType: "flooringWorkOrder",
      },
      () => createWorkOrderUseCase(body),
    )
    return routeJson(access, { workOrder }, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
