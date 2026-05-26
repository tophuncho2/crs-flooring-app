import { searchInventoryOptionsUseCase } from "@builders/application"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateInventorySearchQuery } from "../../_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/inventory/options/search",
  )
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateInventorySearchQuery(url.searchParams)
    const result = await searchInventoryOptionsUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}
