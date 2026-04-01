import { authorizeServicesRoute } from "@/modules/shared/access/lookup-domains"
import { parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { deleteServiceEntry, updateServiceEntry } from "@/modules/services/application/manage-service"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await authorizeServicesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "services.write",
    limit: 30,
    windowMs: 10 * 60 * 1000,
    route: "/api/services/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const service = await updateServiceEntry(id, {
      name: parseRequiredString(body.name, "name"),
      unitId: parseRequiredString(body.unitId, "unitId"),
      baseCost: parseRequiredString(body.baseCost, "baseCost"),
      notes: parseOptionalString(body.notes),
    })

    return routeJson(access, { service })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await authorizeServicesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "services.delete",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    route: "/api/services/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    await deleteServiceEntry(id)
    return routeJson(access, { ok: true })
  } catch (error) {
    return routeError(access, error)
  }
}
