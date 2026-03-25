import { authorizeWorkOrdersRoute } from "@/features/flooring/shared/access/templates-work-orders"
import { syncTemplateToWorkOrderUseCase } from "@/features/flooring/work-orders/application/sync-template"
import { withMutationTelemetry } from "@/features/flooring/shared/application/mutation-telemetry"
import {
  enforceRouteRateLimit,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  const access = await authorizeWorkOrdersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "workOrders.syncTemplate.write",
    limit: 25,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/work-orders/[id]/sync-template",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const result = await withMutationTelemetry(
      access,
      {
        message: "Work order synced from template",
        action: "workOrders.syncTemplate",
        route: "/api/flooring/work-orders/[id]/sync-template",
        entityType: "flooringWorkOrder",
        entityId: id,
        details: { templateId: typeof body.templateId === "string" ? body.templateId : null },
      },
      () => syncTemplateToWorkOrderUseCase(id, body),
    )
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}
