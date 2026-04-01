import { authorizeWorkOrdersRoute } from "@/modules/shared/access/templates-work-orders"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { syncTemplateToWorkOrderUseCase } from "@/modules/work-orders/application/sync-template"
import { withWorkOrderCapabilities } from "@/modules/work-orders/transport/detail"
import { validateSyncTemplateToWorkOrderInput } from "@/modules/work-orders/validators"
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
    capability: "workOrders.syncTemplate",
    rateLimit: {
      scope: "workOrders.syncTemplate.write",
      limit: 25,
      windowMs: 10 * 60 * 1000,
      route: "/api/work-orders/[id]/sync-template",
    },
  })
  if (access instanceof Response) return access

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateSyncTemplateToWorkOrderInput, {
      requireExpectedUpdatedAt: true,
    })
    const receipt = await enforceMutationReceipt({
      scope: "workOrders.syncTemplate",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }

    const result = await withMutationTelemetry(
      access,
      {
        message: "Work order synced from template",
        action: "workOrders.syncTemplate",
        route: "/api/work-orders/[id]/sync-template",
        entityType: "flooringWorkOrder",
        entityId: id,
        details: { templateId: input.templateId },
      },
      () =>
        syncTemplateToWorkOrderUseCase(id, {
          ...input,
          expectedUpdatedAt: mutation.expectedUpdatedAt ? new Date(mutation.expectedUpdatedAt) : null,
        }),
    )

    const responseBody = {
      ...result,
      workOrder: result.workOrder ? withWorkOrderCapabilities(result.workOrder, access.user.role) : null,
    }
    await finalizeMutationReceipt({
      scope: "workOrders.syncTemplate",
      access,
      mutation,
      responseStatus: 200,
      responseBody,
    })

    return routeJson(access, responseBody)
  } catch (error) {
    return routeError(access, error)
  }
}
