import { searchLocationOptionsUseCase } from "@builders/application"
import { LOCATIONS_TOOL_SLUG } from "@/modules/shared/access/lookup-domains"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"
import { validateLocationOptionsQuery } from "../_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    capability: "system.access",
    toolSlug: LOCATIONS_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/locations/options",
  )
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateLocationOptionsQuery(url.searchParams)
    const options = await searchLocationOptionsUseCase(input)
    return routeJson(access, { options })
  } catch (error) {
    return routeError(access, error)
  }
}
