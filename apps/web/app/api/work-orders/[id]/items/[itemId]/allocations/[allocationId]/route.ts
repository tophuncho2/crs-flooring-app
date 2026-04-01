import { authorizeWorkOrdersRoute } from "@/modules/shared/access/templates-work-orders"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  deleteWorkOrderItemAllocationUseCase,
  updateWorkOrderItemAllocationUseCase,
} from "@/modules/work-orders/application/allocations"
import { getWorkOrderById } from "@/modules/work-orders/queries"
import { withWorkOrderCapabilities } from "@/modules/work-orders/transport/detail"
import { validateUpdateWorkOrderItemAllocationInput } from "@/modules/work-orders/validators"
import { createAppError, parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string; itemId: string; allocationId: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "workOrders.allocate",
    rateLimit: {
      scope: "workOrders.allocations.write",
      limit: 120,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/items/[itemId]/allocations/[allocationId]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, itemId: rawItemId, allocationId: rawAllocationId } = await params
    const id = parseUuidParam(rawId, "id")
    const itemId = parseUuidParam(rawItemId, "itemId")
    const allocationId = parseUuidParam(rawAllocationId, "allocationId")
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateWorkOrderItemAllocationInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    const currentItem = currentSnapshot.items.find((item) => item.id === itemId)
    const currentAllocation = currentItem?.allocations.find((allocation) => allocation.id === allocationId)
    if (!currentItem || !currentAllocation) {
      throw createAppError("Record not found", { status: 404 })
    }
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentAllocation.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { workOrder: currentSnapshot },
      message: "Allocation changed before save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.allocations.update",
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
        message: "Work order allocation updated",
        action: "workOrders.allocations.update",
        route: "/api/work-orders/[id]/items/[itemId]/allocations/[allocationId]",
        entityType: "flooringWorkOrderItemAllocation",
        entityId: allocationId,
      },
      () =>
        updateWorkOrderItemAllocationUseCase({
          workOrderId: id,
          workOrderItemId: itemId,
          allocationId,
          ...input,
        }),
    )
    const responseBody = {
      allocation,
      workOrder: withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role),
    }
    await finalizeMutationReceipt({
      scope: "workOrders.allocations.update",
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

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "workOrders.allocate",
    rateLimit: {
      scope: "workOrders.allocations.delete",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/items/[itemId]/allocations/[allocationId]",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId, itemId: rawItemId, allocationId: rawAllocationId } = await params
    const id = parseUuidParam(rawId, "id")
    const itemId = parseUuidParam(rawItemId, "itemId")
    const allocationId = parseUuidParam(rawAllocationId, "allocationId")
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    const currentItem = currentSnapshot.items.find((item) => item.id === itemId)
    const currentAllocation = currentItem?.allocations.find((allocation) => allocation.id === allocationId)
    if (!currentItem || !currentAllocation) {
      throw createAppError("Record not found", { status: 404 })
    }
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentAllocation.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { workOrder: currentSnapshot },
      message: "Allocation changed before delete completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.allocations.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    await withMutationTelemetry(
      access,
      {
        message: "Work order allocation deleted",
        action: "workOrders.allocations.delete",
        route: "/api/work-orders/[id]/items/[itemId]/allocations/[allocationId]",
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
    const responseBody = {
      ok: true as const,
      workOrder: withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role),
    }
    await finalizeMutationReceipt({
      scope: "workOrders.allocations.delete",
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
