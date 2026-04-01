import { authorizeTemplatesRoute } from "@/modules/shared/access/templates-work-orders"
import { createTemplateUseCase } from "@/modules/templates/application/manage-template"
import { listTemplates } from "@/modules/templates/queries"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  try {
    return routeJson(access, {
      templates: await listTemplates(undefined, {
        searchQuery: "",
        isAscendingSort: true,
        isGroupingEnabled: false,
        groupByKeys: [],
      }),
    })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "templates.create",
    limit: 50,
    windowMs: 10 * 60 * 1000,
    route: "/api/templates",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = (await request.json()) as Record<string, unknown>
    const template = await withMutationTelemetry(
      access,
      {
        message: "Template created",
        action: "templates.create",
        route: "/api/templates",
        entityType: "flooringTemplate",
      },
      () => createTemplateUseCase(body),
    )
    return routeJson(access, { template }, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
