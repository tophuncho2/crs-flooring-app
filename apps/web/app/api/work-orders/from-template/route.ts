import { syncTemplateToWorkOrderUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateSyncTemplateToWorkOrderInput } from "../_validators"

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "work-orders.from-template",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/from-template",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateSyncTemplateToWorkOrderInput)

    const receipt = await enforceMutationReceipt({
      scope: "work-orders.from-template",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Work order synced from template",
        action: "work-orders.from-template",
        route: "/api/work-orders/from-template",
        entityType: "flooringWorkOrder",
      },
      () => syncTemplateToWorkOrderUseCase(input, access.user.email),
    )

    const responseBody = { workOrder: result.workOrder, items: result.items }
    await finalizeMutationReceipt({
      scope: "work-orders.from-template",
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
