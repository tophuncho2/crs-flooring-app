import { searchPropertyOptionsUseCase } from "@builders/application"
import { PROPERTIES_TOOL_SLUG } from "@/modules/shared/access/domain-tools"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"
import { validatePropertyOptionsQuery } from "../_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, {
    toolSlug: PROPERTIES_TOOL_SLUG,
  })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/properties/options")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validatePropertyOptionsQuery(url.searchParams)
    const result = await searchPropertyOptionsUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}
