import { createPropertyUseCase } from "@builders/application"
import { listProperties } from "@builders/db"
import { PROPERTIES_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateCreatePropertyInput } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: PROPERTIES_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/properties")
  if (rateLimited) return rateLimited

  try {
    const properties = await listProperties({})
    return routeJson(access, { properties })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: PROPERTIES_TOOL_SLUG,
    rateLimit: {
      scope: "properties.create",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/properties",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateCreatePropertyInput)

    const receipt = await enforceMutationReceipt({
      scope: "properties.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Property created",
        action: "properties.create",
        route: "/api/properties",
        entityType: "flooringProperty",
      },
      () => createPropertyUseCase(input),
    )

    const responseBody = { property: result }
    await finalizeMutationReceipt({
      scope: "properties.create",
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
