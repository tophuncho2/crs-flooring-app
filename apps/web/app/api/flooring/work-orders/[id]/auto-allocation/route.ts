import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import {
  getWorkOrderAutoAllocationStatusUseCase,
  requestWorkOrderAutoAllocationUseCase,
} from "@/features/flooring/work-orders/application/allocations"
import { buildWorkOrderAutoAllocationStatusResponse } from "@/features/flooring/work-orders/transport/allocations"
import { getWorkOrderById } from "@/features/flooring/work-orders/queries"
import { withWorkOrderCapabilities } from "@/features/flooring/work-orders/transport/detail"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request, { capability: "workOrders.read" })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const run = await getWorkOrderAutoAllocationStatusUseCase(id)
    return routeJson(access, buildWorkOrderAutoAllocationStatusResponse(run))
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "workOrders.allocate",
    rateLimit: {
      scope: "workOrders.autoAllocation.write",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/flooring/work-orders/[id]/auto-allocation",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const id = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentSnapshot.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { workOrder: currentSnapshot },
      message: "Work order changed before auto allocation was requested. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.autoAllocation.request",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
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
    const responseBody = {
      ...buildWorkOrderAutoAllocationStatusResponse(run),
      workOrder: currentSnapshot,
    }
    await finalizeMutationReceipt({
      scope: "workOrders.autoAllocation.request",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
