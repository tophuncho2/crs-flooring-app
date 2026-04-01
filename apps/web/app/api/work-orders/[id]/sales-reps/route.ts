import { authorizeWorkOrdersRoute } from "@/modules/shared/access/templates-work-orders"
import { withWorkOrderCapabilities } from "@/modules/work-orders/transport/detail"
import {
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"
import { createWorkOrderSalesRep } from "@/modules/work-orders/mutations"
import { getWorkOrderById, listWorkOrderSalesReps } from "@/modules/work-orders/queries"
import { validateWorkOrderSalesRepInput } from "@/modules/work-orders/validators"
import { applyRoutePolicy, enforceMutationReceipt, finalizeMutationReceipt, parseMutationEnvelope } from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request, { capability: "workOrders.read" })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { items: await listWorkOrderSalesReps(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    capability: "workOrders.write",
    rateLimit: {
      scope: "workOrders.salesReps.write",
      limit: 80,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/sales-reps",
    },
  })
  if (access instanceof Response) return access

  const { id } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateWorkOrderSalesRepInput)
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.salesReps.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    const item = await createWorkOrderSalesRep(id, input)
    const snapshot = withWorkOrderCapabilities(await getWorkOrderById(id), access.user.role)
    logRouteMutationSuccess(access, {
      message: "Work order sales rep created",
      action: "workOrders.salesReps.create",
      route: "/api/work-orders/[id]/sales-reps",
      entityType: "flooringWorkOrderSalesRep",
      entityId: item.id,
      details: { workOrderId: id, contactId: item.contactId },
    })
    const responseBody = { item, workOrder: snapshot }
    await finalizeMutationReceipt({
      scope: "workOrders.salesReps.create",
      access,
      mutation,
      responseStatus: 201,
      responseBody,
    })
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Work order sales rep creation failed",
        action: "workOrders.salesReps.create.error",
        route: "/api/work-orders/[id]/sales-reps",
        entityType: "flooringWorkOrderSalesRep",
        details: { workOrderId: id },
      },
      error,
    )
    return routeError(access, error)
  }
}
