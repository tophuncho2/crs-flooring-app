import { authorizeTemplatesRoute } from "@/modules/shared/access/templates-work-orders"
import { createTemplateUseCase } from "@/modules/templates/application/manage-template"
import { listTemplates } from "@/modules/templates/queries"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeTemplatesRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/templates")
  if (rateLimited) return rateLimited

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
  const access = await applyRoutePolicy(request, {
    toolSlug: "templates",
    rateLimit: {
      scope: "templates.create",
      limit: 50,
      windowMs: 10 * 60 * 1000,
      route: "/api/templates",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, (inputBody) => inputBody)
    const receipt = await enforceMutationReceipt({
      scope: "templates.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) {
      return receipt.replay
    }
    const template = await withMutationTelemetry(
      access,
      {
        message: "Template created",
        action: "templates.create",
        route: "/api/templates",
        entityType: "flooringTemplate",
      },
      () => createTemplateUseCase(input),
    )
    const responseBody = { template }
    await finalizeMutationReceipt({
      scope: "templates.create",
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
