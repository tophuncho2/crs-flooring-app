import { authorizeWorkOrdersRoute } from "@/modules/shared/access/templates-work-orders"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  createWorkOrderItemAllocationUseCase,
  listWorkOrderItemAllocationsUseCase,
} from "@/modules/work-orders/application/allocations"
import { getWorkOrderById } from "@/modules/work-orders/queries"
import { buildWorkOrderItemAllocationListResponse } from "@/modules/work-orders/transport/allocations"
import { withWorkOrderCapabilities } from "@/modules/work-orders/transport/detail"
import { validateWorkOrderItemAllocationInput } from "@/modules/work-orders/validators"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceMutationReceipt, enforceQueryRateLimit, finalizeMutationReceipt, parseMutationEnvelope } from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request, { capability: "workOrders.read" })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/work-orders/[id]/items/[itemId]/allocations")
  if (rateLimited) return rateLimited

  try {
    const { id: rawId, itemId: rawItemId } = await params
    const id = parseUuidParam(rawId, "id")
    const itemId = parseUuidParam(rawItemId, "itemId")
    const allocations = await listWorkOrderItemAllocationsUseCase(id, itemId)
    return routeJson(access, buildWorkOrderItemAllocationListResponse(allocations))
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "workOrders.allocate",
    rateLimit: {
      scope: "workOrders.allocations.write",
      limit: 120,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/items/[itemId]/allocations",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, itemId: rawItemId } = await params
    const id = parseUuidParam(rawId, "id")
    const itemId = parseUuidParam(rawItemId, "itemId")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateWorkOrderItemAllocationInput)
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.allocations.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    const allocation = await withMutationTelemetry(
      access,
      {
        message: "Work order allocation created",
        action: "workOrders.allocations.create",
        route: "/api/work-orders/[id]/items/[itemId]/allocations",
        entityType: "flooringWorkOrderItemAllocation",
        entityId: itemId,
      },
      () =>
        createWorkOrderItemAllocationUseCase({
          workOrderId: id,
          workOrderItemId: itemId,
          ...input,
        }),
    )
    const responseBody = {
      allocation,
      workOrder: withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role),
    }
    await finalizeMutationReceipt({
      scope: "workOrders.allocations.create",
      access,
      mutation,
      responseStatus: 201,
      responseBody,
    })
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
