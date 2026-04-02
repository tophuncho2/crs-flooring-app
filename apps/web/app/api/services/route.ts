import { SERVICES_TOOL_SLUG, authorizeServicesRoute } from "@/modules/shared/access/lookup-domains"
import { parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { createServiceEntry } from "@/modules/services/application/manage-service"
import { listServices } from "@/modules/services/data/queries"
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
  const access = await authorizeServicesRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/services")
  if (rateLimited) return rateLimited

  try {
    return routeJson(access, { services: await listServices() })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: SERVICES_TOOL_SLUG,
    rateLimit: {
      scope: "services.write",
      limit: 30,
      windowMs: 10 * 60 * 1000,
      route: "/api/services",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, (inputBody) => ({
      name: parseRequiredString(inputBody.name, "name"),
      unitId: parseRequiredString(inputBody.unitId, "unitId"),
      baseCost: parseRequiredString(inputBody.baseCost, "baseCost"),
      notes: parseOptionalString(inputBody.notes),
    }))
    const receipt = await enforceMutationReceipt({
      scope: "services.create",
      request,
      access,
      mutation,
      body,
    })
    if (receipt.replay) return receipt.replay

    const service = await withMutationTelemetry(
      access,
      {
        message: "Service created",
        action: "services.create",
        route: "/api/services",
        entityType: "flooringService",
      },
      () => createServiceEntry(input),
    )

    const responseBody = { service }
    await finalizeMutationReceipt({
      scope: "services.create",
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
