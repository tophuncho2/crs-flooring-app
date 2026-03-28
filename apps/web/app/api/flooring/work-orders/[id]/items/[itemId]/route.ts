import { Prisma } from "@builders/db"
import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { createAppError } from "@/server/http/api-helpers"
import { withWorkOrderCapabilities } from "@/features/flooring/work-orders/transport/detail"
import {
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { deleteWorkOrderItem, updateWorkOrderItem } from "@/features/flooring/work-orders/mutations"
import { getWorkOrderById } from "@/features/flooring/work-orders/queries"
import { validateUpdateWorkOrderMaterialItemInput } from "@/features/flooring/work-orders/validators"
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
      scope: "workOrders.items.write",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/flooring/work-orders/[id]/items/[itemId]",
    },
  })
  if (access instanceof Response) return access

  const { id, itemId } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateWorkOrderMaterialItemInput, {
      requireExpectedUpdatedAt: true,
    })
    const currentSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    const currentItem = currentSnapshot.items.find((item) => item.id === itemId)
    if (!currentItem) {
      throw createAppError("Record not found", { status: 404 })
    }
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentItem.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { workOrder: currentSnapshot },
      message: "Material item changed before save completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.items.update",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    const item = await updateWorkOrderItem(itemId, input)
    const nextSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    logRouteMutationSuccess(access, {
      message: "Work order material item updated",
      action: "workOrders.items.update",
      route: "/api/flooring/work-orders/[id]/items/[itemId]",
      entityType: "flooringWorkOrderItem",
      entityId: item.id,
      details: { productId: item.productId },
    })
    const responseBody = { item, workOrder: nextSnapshot }
    await finalizeMutationReceipt({
      scope: "workOrders.items.update",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })
    return routeJson(access, responseBody)
  } catch (error) {
    let normalizedError = error
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      normalizedError = createAppError("The selected product or work order does not exist", { status: 404, field: "productId" })
    }
    logRouteMutationFailure(
      access,
      {
        message: "Work order material item update failed",
        action: "workOrders.items.update.error",
        route: "/api/flooring/work-orders/[id]/items/[itemId]",
        entityType: "flooringWorkOrderItem",
        entityId: itemId,
      },
      normalizedError,
    )
    return routeError(access, normalizedError)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "workOrders.delete",
    rateLimit: {
      scope: "workOrders.items.delete",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/flooring/work-orders/[id]/items/[itemId]",
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
    const currentItem = currentSnapshot.items.find((item) => item.id === itemId)
    if (!currentItem) {
      throw createAppError("Record not found", { status: 404 })
    }
    assertExpectedUpdatedAt({
      actualUpdatedAt: currentItem.updatedAt,
      expectedUpdatedAt: mutation.expectedUpdatedAt,
      snapshot: { workOrder: currentSnapshot },
      message: "Material item changed before delete completed. Refresh and try again.",
    })
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.items.delete",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    await deleteWorkOrderItem(itemId)
    const nextSnapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    logRouteMutationSuccess(access, {
      message: "Work order material item deleted",
      action: "workOrders.items.delete",
      route: "/api/flooring/work-orders/[id]/items/[itemId]",
      entityType: "flooringWorkOrderItem",
      entityId: itemId,
    })
    const responseBody = { ok: true as const, workOrder: nextSnapshot }
    await finalizeMutationReceipt({
      scope: "workOrders.items.delete",
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
        message: "Work order material item deletion failed",
        action: "workOrders.items.delete.error",
        route: "/api/flooring/work-orders/[id]/items/[itemId]",
        entityType: "flooringWorkOrderItem",
        entityId: itemId,
      },
      error,
    )
    return routeError(access, error)
  }
}
