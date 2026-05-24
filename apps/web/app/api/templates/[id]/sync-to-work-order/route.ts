import { syncTemplateToWorkOrderUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/server/telemetry/mutation-telemetry"
import { parseUuidParam } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      scope: "templates.sync-to-work-order",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/templates/[id]/sync-to-work-order",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id: rawId } = await params
    const templateId = parseUuidParam(rawId, "id")
    const body = (await request.json()) as Record<string, unknown>
    const { mutation } = parseMutationEnvelope(body, () => ({}))

    const receipt = await enforceMutationReceipt({
      scope: "templates.sync-to-work-order",
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
        action: "templates.sync-to-work-order",
        route: "/api/templates/[id]/sync-to-work-order",
        entityType: "flooringWorkOrder",
      },
      () => syncTemplateToWorkOrderUseCase({ templateId }),
    )

    const responseBody = { workOrder: result.workOrder, items: result.items }
    await finalizeMutationReceipt({
      scope: "templates.sync-to-work-order",
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
