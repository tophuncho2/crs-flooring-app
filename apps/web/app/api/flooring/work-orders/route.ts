import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { createWorkOrderUseCase } from "@/features/flooring/work-orders/application/manage-work-order"
import { getWorkOrderById, listWorkOrders } from "@/features/flooring/work-orders/queries"
import { withWorkOrderCapabilities } from "@/features/flooring/work-orders/transport/detail"
import { validateCreateWorkOrderInput } from "@/features/flooring/work-orders/validators"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceMutationReceipt, finalizeMutationReceipt, parseMutationEnvelope } from "@/server/http/route-policy"

export async function GET(request: Request) {
  const access = await authorizeWorkOrdersRoute(request, { capability: "workOrders.read" })
  if (access instanceof Response) return access

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
      route: "/api/flooring/work-orders",
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
        route: "/api/flooring/work-orders",
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
