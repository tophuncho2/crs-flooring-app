import { createPropertyHubUseCase } from "@builders/application"
import { PROPERTIES_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateCreatePropertyHubInput } from "./_validators"

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: PROPERTIES_TOOL_SLUG,
    rateLimit: {
      scope: "properties.hub.create",
      limit: 10,
      windowMs: 10 * 60 * 1000,
      route: "/api/properties/hub",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreatePropertyHubInput)

    const receipt = await enforceMutationReceipt({
      scope: "properties.hub.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Property hub created",
        action: "properties.hub.create",
        route: "/api/properties/hub",
        entityType: "flooringProperty",
      },
      () => createPropertyHubUseCase(input),
    )

    const responseBody = {
      property: result.property,
      managementCompany: result.managementCompany,
    }
    await finalizeMutationReceipt({
      scope: "properties.hub.create",
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
