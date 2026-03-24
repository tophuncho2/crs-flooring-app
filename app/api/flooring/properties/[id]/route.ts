import { deleteProperty, updateProperty } from "@/features/flooring/properties/data/mutations"
import { getPropertyById } from "@/features/flooring/properties/data/queries"
import { validateUpdatePropertyInput } from "@/features/flooring/properties/domain/validators"
import { authorizePropertiesRoute } from "@/features/flooring/shared/access/domain-tools"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteContext) {
  const access = await authorizePropertiesRoute(request)
  if (access instanceof Response) return access

  try {
    const { id } = await params
    return routeJson(access, { property: await getPropertyById(id) })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await authorizePropertiesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "properties.write",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/properties/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>
    const property = await updateProperty(id, validateUpdatePropertyInput(body))
    return routeJson(access, { property })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const access = await authorizePropertiesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "properties.delete",
    limit: 10,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/properties/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await params
    await deleteProperty(id)
    return routeJson(access, { ok: true })
  } catch (error) {
    return routeError(access, error)
  }
}
