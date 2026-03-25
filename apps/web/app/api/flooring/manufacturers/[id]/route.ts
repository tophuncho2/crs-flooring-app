import { parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { deleteManufacturer, updateManufacturer } from "@/features/flooring/manufacturers/mutations"
import { authorizeManufacturersRoute } from "@/features/flooring/shared/access/lookup-domains"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await authorizeManufacturersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "manufacturers.write",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/manufacturers/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await context.params
    const body = (await request.json()) as Record<string, unknown>
    const companyName = parseRequiredString(body.companyName, "companyName")
    const agentName = parseOptionalString(body.agentName ?? body.name)
    const manufacturer = await updateManufacturer(id, {
      companyName,
      agentName,
      website: parseOptionalString(body.website),
      phone: parseOptionalString(body.phone),
      email: parseOptionalString(body.email),
    })
    logRouteMutationSuccess(access, {
      message: "Manufacturer updated",
      action: "manufacturers.update",
      route: "/api/flooring/manufacturers/[id]",
      entityType: "flooringManufacturer",
      entityId: id,
    })

    return routeJson(access, { manufacturer })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Manufacturer update failed",
        action: "manufacturers.update.error",
        route: "/api/flooring/manufacturers/[id]",
        entityType: "flooringManufacturer",
        entityId: (await context.params).id,
      },
      error,
    )
    return routeError(access, error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const access = await authorizeManufacturersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "manufacturers.delete",
    limit: 10,
    windowMs: 10 * 60 * 1000,
    route: "/api/flooring/manufacturers/[id]",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { id } = await context.params
    const result = await deleteManufacturer(id)
    logRouteMutationSuccess(access, {
      message: "Manufacturer deleted",
      action: "manufacturers.delete",
      route: "/api/flooring/manufacturers/[id]",
      entityType: "flooringManufacturer",
      entityId: id,
    })
    return routeJson(access, result)
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Manufacturer deletion failed",
        action: "manufacturers.delete.error",
        route: "/api/flooring/manufacturers/[id]",
        entityType: "flooringManufacturer",
        entityId: (await context.params).id,
      },
      error,
    )
    return routeError(access, error)
  }
}
