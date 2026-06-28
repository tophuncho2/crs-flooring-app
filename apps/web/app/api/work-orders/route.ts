import { createWorkOrderUseCase, listWorkOrdersUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateCreateWorkOrderInput, validateListWorkOrdersQuery } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/work-orders")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListWorkOrdersQuery(url.searchParams)
    const { rows, total } = await listWorkOrdersUseCase(input)
    return routeJson(access, { rows, total })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_CREATE,
      scope: "work-orders.create",
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
      () => createWorkOrderUseCase(input, access.user.email),
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
