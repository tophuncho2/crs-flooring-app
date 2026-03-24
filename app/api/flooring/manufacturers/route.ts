import { parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { createManufacturer } from "@/features/flooring/manufacturers/mutations"
import { listManufacturers } from "@/features/flooring/manufacturers/queries"
import { normalizeManufacturer } from "@/features/flooring/manufacturers/services"
import { authorizeManufacturersRoute } from "@/features/flooring/shared/access/lookup-domains"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

function normalizeManufacturerResponse(
  manufacturer:
    | ReturnType<typeof normalizeManufacturer>
    | Parameters<typeof normalizeManufacturer>[0],
) {
  return "productsCount" in manufacturer ? manufacturer : normalizeManufacturer(manufacturer)
}

export async function GET(request: Request) {
  const access = await authorizeManufacturersRoute(request)
  if (access instanceof Response) return access

  try {
    const manufacturers = await listManufacturers()

    return routeJson(access, { manufacturers: manufacturers.map(normalizeManufacturerResponse) })
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
    route: "/api/flooring/manufacturers",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = (await request.json()) as Record<string, unknown>
    const companyName = parseRequiredString(body.companyName, "companyName")
    const agentName = parseOptionalString(body.agentName ?? body.name)
    const manufacturer = await createManufacturer({
      companyName,
      agentName,
      website: parseOptionalString(body.website),
      phone: parseOptionalString(body.phone),
      email: parseOptionalString(body.email),
    })

    return routeJson(access, { manufacturer: normalizeManufacturer(manufacturer) }, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
