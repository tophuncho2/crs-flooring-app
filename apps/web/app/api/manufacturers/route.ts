import { createManufacturerRecord, validateUpdateManufacturerPrimarySectionInput } from "@/modules/manufacturers/application/manage-manufacturer"
import { listManufacturers } from "@/modules/manufacturers/queries"
import { authorizeManufacturersRoute } from "@/modules/shared/access/lookup-domains"
import {
  enforceRouteRateLimit,
  logRouteMutationFailure,
  logRouteMutationSuccess,
  routeError,
  routeJson,
} from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizeManufacturersRoute(request)
  if (access instanceof Response) return access

  try {
    const manufacturers = await listManufacturers()

    return routeJson(access, { manufacturers })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await authorizeManufacturersRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "manufacturers.write",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    route: "/api/manufacturers",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = (await request.json()) as Record<string, unknown>
    const manufacturer = await createManufacturerRecord(validateUpdateManufacturerPrimarySectionInput(body))
    logRouteMutationSuccess(access, {
      message: "Manufacturer created",
      action: "manufacturers.create",
      route: "/api/manufacturers",
      entityType: "flooringManufacturer",
      entityId: manufacturer.id,
    })

    return routeJson(access, { manufacturer }, { status: 201 })
  } catch (error) {
    logRouteMutationFailure(
      access,
      {
        message: "Manufacturer creation failed",
        action: "manufacturers.create.error",
        route: "/api/manufacturers",
        entityType: "flooringManufacturer",
      },
      error,
    )
    return routeError(access, error)
  }
}
