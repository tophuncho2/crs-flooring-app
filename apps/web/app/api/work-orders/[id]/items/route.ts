import { Prisma } from "@builders/db"
import { authorizeWorkOrdersRoute } from "@/modules/shared/access/templates-work-orders"
import { createAppError } from "@/server/http/api-helpers"
import { withWorkOrderCapabilities } from "@/modules/work-orders/transport/detail"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { createWorkOrderItem } from "@/modules/work-orders/mutations"
import { getWorkOrderById, listWorkOrderItems } from "@/modules/work-orders/queries"
import { validateWorkOrderMaterialItemInput } from "@/modules/work-orders/validators"
import { applyRoutePolicy, enforceMutationReceipt, finalizeMutationReceipt, parseMutationEnvelope } from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request, { capability: "workOrders.read" })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { items: await listWorkOrderItems(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "workOrders.write",
    rateLimit: {
      scope: "workOrders.items.write",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/items",
    },
  })
  if (access instanceof Response) return access

  const { id } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateWorkOrderMaterialItemInput)
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.items.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    const item = await createWorkOrderItem(id, input)
    const snapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    logRouteMutationSuccess(access, {
      message: "Work order material item created",
      action: "workOrders.items.create",
      route: "/api/work-orders/[id]/items",
      entityType: "flooringWorkOrderItem",
      entityId: item.id,
      details: { workOrderId: id, productId: item.productId },
    })
    const responseBody = { item, workOrder: snapshot }
    await finalizeMutationReceipt({
      scope: "workOrders.items.create",
      access,
      mutation,
      responseStatus: 201,
      responseBody,
    })
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    let normalizedError = error
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      normalizedError = createAppError("The selected product or work order does not exist", { status: 404, field: "productId" })
    }
    logRouteMutationFailure(
      access,
      {
        message: "Work order material item creation failed",
        action: "workOrders.items.create.error",
        route: "/api/work-orders/[id]/items",
        entityType: "flooringWorkOrderItem",
        details: { workOrderId: id },
      },
      normalizedError,
    )
    return routeError(access, normalizedError)
  }
}
