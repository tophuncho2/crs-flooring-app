import { Prisma } from "@builders/db"
import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { createAppError } from "@/server/http/api-helpers"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { deleteWorkOrderItem, updateWorkOrderItem } from "@/features/flooring/work-orders/mutations"
import { validateUpdateWorkOrderMaterialItemInput } from "@/features/flooring/work-orders/validators"

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.items.write",
    limit: 80,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]/items/[itemId]",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { itemId } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const item = await updateWorkOrderItem(itemId, validateUpdateWorkOrderMaterialItemInput(body))
    logRouteMutationSuccess(access, {
      message: "Work order material item updated",
      action: "workOrders.items.update",
      route: "/api/flooring/work-orders/[id]/items/[itemId]",
      entityType: "flooringWorkOrderItem",
      entityId: item.id,
      details: { productId: item.productId },
    })
    return routeJson(access, { item })
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
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.items.delete",
    limit: 50,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]/items/[itemId]",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { itemId } = await params

  try {
    await deleteWorkOrderItem(itemId)
    logRouteMutationSuccess(access, {
      message: "Work order material item deleted",
      action: "workOrders.items.delete",
      route: "/api/flooring/work-orders/[id]/items/[itemId]",
      entityType: "flooringWorkOrderItem",
      entityId: itemId,
    })
    return routeJson(access, { ok: true })
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
