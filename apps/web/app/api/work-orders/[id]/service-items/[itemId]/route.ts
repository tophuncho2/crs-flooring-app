import { authorizeWorkOrdersRoute } from "@/modules/shared/access/templates-work-orders"
import { createAppError } from "@/server/http/api-helpers"
import { withWorkOrderCapabilities } from "@/modules/work-orders/transport/detail"
import {
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { deleteWorkOrderServiceItem, updateWorkOrderServiceItem } from "@/modules/work-orders/mutations"
import { getWorkOrderById } from "@/modules/work-orders/queries"
import { validateUpdateWorkOrderServiceItemInput } from "@/modules/work-orders/validators"
import {
  applyRoutePolicy,
  assertExpectedUpdatedAt,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "workOrders.write",
    rateLimit: {
      scope: "workOrders.serviceItems.write",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/service-items/[itemId]",
    },
  })
  if (access instanceof Response) return access

  const { id, itemId } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateWorkOrderServiceItemInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    const currentItem = currentSnapshot.serviceItems.find((item) => item.id === itemId)
    if (!currentItem) {
      throw createAppError("Record not found", { status: 404 })
    }
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentItem.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { workOrder: currentSnapshot },
      message: "Service item changed before save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.serviceItems.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    const item = await updateWorkOrderServiceItem(itemId, input)
    const nextSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    logRouteMutationSuccess(access, {
      message: "Work order service item updated",
      action: "workOrders.serviceItems.update",
      route: "/api/work-orders/[id]/service-items/[itemId]",
      entityType: "flooringWorkOrderServiceItem",
      entityId: item.id,
      details: { serviceId: item.serviceId ?? null, unitId: item.unitId },
    })
    const responseBody = { item, workOrder: nextSnapshot }
    await finalizeMutationReceipt({
      scope: "workOrders.serviceItems.update",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Work order service item update failed",
        action: "workOrders.serviceItems.update.error",
        route: "/api/work-orders/[id]/service-items/[itemId]",
        entityType: "flooringWorkOrderServiceItem",
        entityId: itemId,
      },
      error,
    )
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "workOrders.delete",
    rateLimit: {
      scope: "workOrders.serviceItems.delete",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/service-items/[itemId]",
    },
  })
  if (access instanceof Response) return access

  const { id, itemId } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input: _, mutation } = parseMutationEnvelope(body, (value) => value, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    const currentItem = currentSnapshot.serviceItems.find((item) => item.id === itemId)
    if (!currentItem) {
      throw createAppError("Record not found", { status: 404 })
    }
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentItem.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { workOrder: currentSnapshot },
      message: "Service item changed before delete completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.serviceItems.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    await deleteWorkOrderServiceItem(itemId)
    const nextSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    logRouteMutationSuccess(access, {
      message: "Work order service item deleted",
      action: "workOrders.serviceItems.delete",
      route: "/api/work-orders/[id]/service-items/[itemId]",
      entityType: "flooringWorkOrderServiceItem",
      entityId: itemId,
    })
    const responseBody = { ok: true as const, workOrder: nextSnapshot }
    await finalizeMutationReceipt({
      scope: "workOrders.serviceItems.delete",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Work order service item deletion failed",
        action: "workOrders.serviceItems.delete.error",
        route: "/api/work-orders/[id]/service-items/[itemId]",
        entityType: "flooringWorkOrderServiceItem",
        entityId: itemId,
      },
      error,
    )
    return routeError(access, error)
  }
}
