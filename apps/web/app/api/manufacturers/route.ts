import { createManufacturerUseCase, listManufacturersUseCase } from "@builders/application"
import { MANUFACTURERS_TOOL_SLUG } from "@/modules/shared/access/lookup-domains"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { applyRoutePolicy, enforceMutationReceipt, enforceQueryRateLimit, finalizeMutationReceipt, parseMutationEnvelope } from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateListManufacturersQuery, validateManufacturerInput } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: MANUFACTURERS_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/manufacturers")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListManufacturersQuery(url.searchParams)
    const result = await listManufacturersUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: MANUFACTURERS_TOOL_SLUG,
    rateLimit: {
      scope: "manufacturers.write",
      limit: 20,
      windowMs: 10 * 60 * 1000,
      route: "/api/manufacturers",
    },
  })
  if (access instanceof Response) return access

  try {
    const body = (await request.json()) as Record<string, unknown>
    const { input, mutation } = parseMutationEnvelope(body, validateManufacturerInput)

    const receipt = await enforceMutationReceipt({ scope: "manufacturers.create", request, access, mutation, body })
    if (receipt.replay) return receipt.replay

    const result = await withMutationTelemetry(
      access,
      {
        message: "Manufacturer created",
        action: "manufacturers.create",
        route: "/api/manufacturers",
        entityType: "flooringManufacturer",
      },
      () => createManufacturerUseCase(input),
    )

    const responseBody = { manufacturer: result }
    await finalizeMutationReceipt({ scope: "manufacturers.create", access, mutation, responseStatus: 201, responseBody })
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
