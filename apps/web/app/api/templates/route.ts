import { createTemplateUseCase } from "@builders/application"
import { listTemplates } from "@builders/db"
import { TEMPLATES_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateCreateTemplateInput } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: TEMPLATES_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/templates")
  if (rateLimited) return rateLimited

  try {
    const templates = await listTemplates({})
    return routeJson(access, { templates })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: TEMPLATES_TOOL_SLUG,
    rateLimit: {
      scope: "templates.create",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/templates",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreateTemplateInput)

    const receipt = await enforceMutationReceipt({
      scope: "templates.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Template created",
        action: "templates.create",
        route: "/api/templates",
        entityType: "flooringTemplate",
      },
      () => createTemplateUseCase(input),
    )

    const responseBody = { template: result }
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
