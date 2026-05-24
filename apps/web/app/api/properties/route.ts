import { createPropertyUseCase, listPropertiesUseCase } from "@builders/application"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceMutationReceipt,
  enforceQueryRateLimit,
  finalizeMutationReceipt,
  parseMutationEnvelope,
} from "@/server/http/route-policy"
import { validateCreatePropertyInput, validateListPropertiesQuery } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/properties")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListPropertiesQuery(url.searchParams)
    const result = await listPropertiesUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    rateLimit: {
      ...CRUD_CREATE,
      scope: "properties.create",
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
