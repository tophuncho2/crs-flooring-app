import { authorizeServicesRoute } from "@/features/flooring/shared/access/lookup-domains"
import { parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { createService } from "@/features/flooring/services/mutations"
import { listServices } from "@/features/flooring/services/queries"
import { normalizeServiceRow } from "@/features/flooring/services/services"
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
    route: "/api/flooring/services",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = (await request.json()) as Record<string, unknown>
    const service = await createService({
      name: parseRequiredString(body.name, "name"),
      unitId: parseRequiredString(body.unitId, "unitId"),
      baseCost: parseRequiredString(body.baseCost, "baseCost"),
      notes: parseOptionalString(body.notes),
    })

    return routeJson(access, { service: normalizeServiceRow(service) }, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
