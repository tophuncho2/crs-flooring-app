import { createManufacturerRecord, validateUpdateManufacturerPrimarySectionInput } from "@/modules/manufacturers/application/manage-manufacturer"
import { listManufacturers } from "@/modules/manufacturers/data/queries"
import { authorizeManufacturersRoute } from "@/modules/shared/access/lookup-domains"
import { withMutationTelemetry } from "@/modules/shared/engines/common/application/mutation-telemetry"
import { applyRoutePolicy, enforceMutationReceipt, enforceQueryRateLimit, finalizeMutationReceipt, parseMutationEnvelope } from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeManufacturersRoute(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/manufacturers")
  if (rateLimited) return rateLimited

  try {
    const manufacturers = await listManufacturers()

    return routeJson(access, { manufacturers })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: "manufacturers",
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
    const { input, mutation } = parseMutationEnvelope(body, validateUpdateManufacturerPrimarySectionInput)

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
      () => createManufacturerRecord(input),
    )

    const responseBody = { manufacturer: result }
    await finalizeMutationReceipt({ scope: "manufacturers.create", access, mutation, responseStatus: 201, responseBody })
    return routeJson(access, responseBody, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
