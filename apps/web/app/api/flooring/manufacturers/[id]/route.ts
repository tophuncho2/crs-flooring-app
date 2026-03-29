import {
  deleteManufacturerRecord,
  replaceManufacturerPrimarySection,
  validateUpdateManufacturerPrimarySectionInput,
} from "@/features/flooring/manufacturers/application/manage-manufacturer"
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
    const manufacturer = await replaceManufacturerPrimarySection(id, validateUpdateManufacturerPrimarySectionInput(body))
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
    const result = await deleteManufacturerRecord(id)
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
