import { PROPERTIES_TOOL_SLUG, authorizePropertiesRoute } from "@/modules/shared/access/domain-tools"
import { createProperty } from "@/modules/properties/data/mutations"
import { listProperties } from "@/modules/properties/data/queries"
import { validateCreatePropertyInput } from "@/modules/properties/validators"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"

export async function GET(request: Request) {
  const access = await authorizePropertiesRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/properties")
  if (rateLimited) return rateLimited

  try {
    return routeJson(access, {
      properties: await listProperties(undefined, {
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
    toolSlug: PROPERTIES_TOOL_SLUG,
    rateLimit: {
      scope: "properties.write",
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

    const property = await withMutationTelemetry(
      access,
      {
        message: "Property created",
        action: "properties.create",
        route: "/api/properties",
        entityType: "flooringProperty",
      },
      () => createProperty(input),
    )

    const responseBody = { property }
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
