import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import {
  createWorkOrderItemAllocationUseCase,
  listWorkOrderItemAllocationsUseCase,
} from "@/features/flooring/work-orders/application/allocations"
import { buildWorkOrderItemAllocationListResponse } from "@/features/flooring/work-orders/transport/allocations"
import { validateWorkOrderItemAllocationInput } from "@/features/flooring/work-orders/validators"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  try {
    const { id, itemId } = await params
    const allocations = await listWorkOrderItemAllocationsUseCase(id, itemId)
    return routeJson(access, buildWorkOrderItemAllocationListResponse(allocations))
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.allocations.write",
    limit: 120,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]/items/[itemId]/allocations",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id, itemId } = await params
    const body = (await request.json()) as Record<string, unknown>
    const allocation = await withMutationTelemetry(
      access,
      {
        message: "Work order allocation created",
        action: "workOrders.allocations.create",
        route: "/api/flooring/work-orders/[id]/items/[itemId]/allocations",
        entityType: "flooringWorkOrderItemAllocation",
        entityId: itemId,
      },
      () =>
        createWorkOrderItemAllocationUseCase({
          workOrderId: id,
          workOrderItemId: itemId,
          ...validateWorkOrderItemAllocationInput(body),
        }),
    )

    return routeJson(access, { allocation }, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
