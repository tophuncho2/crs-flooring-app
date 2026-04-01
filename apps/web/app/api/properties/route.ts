import { authorizePropertiesRoute } from "@/modules/shared/access/domain-tools"
import { createProperty } from "@/modules/properties/mutations"
import { listProperties } from "@/modules/properties/queries"
import { validateCreatePropertyInput } from "@/modules/properties/validators"
import { enforceRouteRateLimit, routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await authorizePropertiesRoute(request)
  if (access instanceof Response) return access

  try {
    return routeJson(access, {
      properties: await listProperties(undefined, {
        searchQuery: "",
        isAscendingSort: true,
        isGroupingEnabled: false,
        groupByKeys: [],
      }),
    })
  } catch (error) {
    return routeError(access, error)
  }
}

export async function POST(request: Request) {
  const access = await authorizePropertiesRoute(request)
  if (access instanceof Response) return access

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: "properties.write",
    limit: 20,
    windowMs: 10 * 60 * 1000,
    route: "/api/properties",
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = (await request.json()) as Record<string, unknown>
    const property = await createProperty(validateCreatePropertyInput(body))
    return routeJson(access, { property }, { status: 201 })
  } catch (error) {
    return routeError(access, error)
  }
}
