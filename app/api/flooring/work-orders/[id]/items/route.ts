import { Prisma } from "@prisma/client"
import { createAppError } from "@/server/http/api-helpers"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  requireRouteAccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { createWorkOrderItem } from "@/features/flooring/work-orders/mutations"
import { listWorkOrderItems } from "@/features/flooring/work-orders/queries"
import { validateWorkOrderMaterialItemInput } from "@/features/flooring/work-orders/validators"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { items: await listWorkOrderItems(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await requireRouteAccess(request, { capability: "system.access", toolSlug: "warehouse" })
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.items.write",
    limit: 80,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]/items",
  })
  if (rateLimitResponse) return rateLimitResponse

  const { id } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const item = await createWorkOrderItem(id, validateWorkOrderMaterialItemInput(body))
    logRouteMutationSuccess(access, {
      message: "Work order material item created",
      action: "workOrders.items.create",
      route: "/api/flooring/work-orders/[id]/items",
      entityType: "flooringWorkOrderItem",
      entityId: item.id,
      details: { workOrderId: id, productId: item.productId, linkedInventoryId: item.linkedInventoryId ?? null },
    })
    return routeJson(access, { item }, { status: 201 })
  } catch (error) {
    let normalizedError = error
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      normalizedError = createAppError("That inventory row is already linked to another work order item", { status: 409, field: "linkedInventoryId" })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      normalizedError = createAppError("The selected product or work order does not exist", { status: 404, field: "productId" })
    }
    logRouteMutationFailure(
      access,
      {
        message: "Work order material item creation failed",
        action: "workOrders.items.create.error",
        route: "/api/flooring/work-orders/[id]/items",
        entityType: "flooringWorkOrderItem",
        details: { workOrderId: id },
      },
      normalizedError,
    )
    return routeError(access, normalizedError)
  }
}
