import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import {
  deleteWorkOrderItemAllocationUseCase,
  updateWorkOrderItemAllocationUseCase,
} from "@/features/flooring/work-orders/application/allocations"
import { validateUpdateWorkOrderItemAllocationInput } from "@/features/flooring/work-orders/validators"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string; itemId: string; allocationId: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.allocations.write",
    limit: 120,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]/items/[itemId]/allocations/[allocationId]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id, itemId, allocationId } = await params
    const body = (await request.json()) as Record<string, unknown>
    const allocation = await withMutationTelemetry(
      access,
      {
        message: "Work order allocation updated",
        action: "workOrders.allocations.update",
        route: "/api/flooring/work-orders/[id]/items/[itemId]/allocations/[allocationId]",
        entityType: "flooringWorkOrderItemAllocation",
        entityId: allocationId,
      },
      () =>
        updateWorkOrderItemAllocationUseCase({
          workOrderId: id,
          workOrderItemId: itemId,
          allocationId,
          ...validateUpdateWorkOrderItemAllocationInput(body),
        }),
    )

    return routeJson(access, { allocation })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.allocations.delete",
    limit: 80,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]/items/[itemId]/allocations/[allocationId]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id, itemId, allocationId } = await params
    await withMutationTelemetry(
      access,
      {
        message: "Work order allocation deleted",
        action: "workOrders.allocations.delete",
        route: "/api/flooring/work-orders/[id]/items/[itemId]/allocations/[allocationId]",
        entityType: "flooringWorkOrderItemAllocation",
        entityId: allocationId,
      },
      () =>
        deleteWorkOrderItemAllocationUseCase({
          workOrderId: id,
          workOrderItemId: itemId,
          allocationId,
        }),
    )

    return routeJson(access, { ok: true })
  } catch (error) {
    return routeError(access, error)
  }
}
