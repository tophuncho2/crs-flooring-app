import { authorizeServicesRoute } from "@/modules/shared/access/lookup-domains"
import { parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { createServiceEntry } from "@/modules/services/application/manage-service"
import { listServices } from "@/modules/services/queries"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeServicesRoute(request)
  if (access instanceof Response) return access

  try {
    return routeJson(access, { services: await listServices() })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await authorizeServicesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "services.write",
    limit: 30,
    windowMs: 10 * 60 * 1000,
    route: "/api/services",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = (await request.json()) as Record<string, unknown>
    const service = await createServiceEntry({
      name: parseRequiredString(body.name, "name"),
      unitId: parseRequiredString(body.unitId, "unitId"),
      baseCost: parseRequiredString(body.baseCost, "baseCost"),
      notes: parseOptionalString(body.notes),
    })

    return routeJson(access, { service }, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
