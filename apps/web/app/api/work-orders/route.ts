import { authorizeWorkOrdersRoute } from "@/modules/shared/access/templates-work-orders"
import { createWorkOrderUseCase } from "@/modules/work-orders/application/manage-work-order"
import { getWorkOrderById, listWorkOrders } from "@/modules/work-orders/queries"
import { withWorkOrderCapabilities } from "@/modules/work-orders/transport/detail"
import { validateCreateWorkOrderInput } from "@/modules/work-orders/validators"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceMutationReceipt, enforceQueryRateLimit, finalizeMutationReceipt, parseMutationEnvelope } from "@/server/http/route-policy"

export async function GET(request: Request) {
  const access = await authorizeWorkOrdersRoute(request, { capability: "workOrders.read" })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/work-orders")
  if (rateLimited) return rateLimited

  try {
    return routeJson(access, {
      workOrders: await listWorkOrders(undefined, {
        searchQuery: "",
        isAscendingSort: true,
        isGroupingEnabled: false,
        groupByKeys: [],
      }, {
        status: [],
        warehouseId: [],
      }),
    })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "workOrders.write",
    rateLimit: {
      scope: "workOrders.create",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateWorkOrderInput)
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    const workOrder = await withMutationTelemetry(
      access,
      {
        message: "Work order created",
        action: "workOrders.create",
        route: "/api/work-orders",
        entityType: "flooringWorkOrder",
      },
      () => createWorkOrderUseCase(input),
    )
    const snapshot = withWorkOrderCapabilities(await getWorkOrderById(workOrder.id), access.user.role)
    const responseBody = { workOrder: snapshot }
    await finalizeMutationReceipt({
      scope: "workOrders.create",
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
