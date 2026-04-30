import { createWorkOrderUseCase } from "@builders/application"
import { listWorkOrders } from "@builders/db"
import { WORK_ORDERS_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateCreateWorkOrderInput } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: WORK_ORDERS_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/work-orders")
  if (rateLimited) return rateLimited

  try {
    const workOrders = await listWorkOrders({})
    return routeJson(access, { workOrders })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: WORK_ORDERS_TOOL_SLUG,
    rateLimit: {
      scope: "work-orders.create",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateWorkOrderInput)

    const receipt = await enforceMutationReceipt({
      scope: "work-orders.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Work order created",
        action: "work-orders.create",
        route: "/api/work-orders",
        entityType: "flooringWorkOrder",
      },
      () => createWorkOrderUseCase(input),
    )

    const responseBody = { workOrder: result }
    await finalizeMutationReceipt({
      scope: "work-orders.create",
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
