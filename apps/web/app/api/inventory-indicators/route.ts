import { listIndicatorsUseCase } from "@builders/application"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateIndicatorsListQuery } from "./_validators"

/**
 * GET /api/inventory-indicators
 *
 * Standalone list of all inventory indicators (the nav list view). Read-only —
 * the list has no create; rows open into the parent product record view.
 */
export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/inventory-indicators")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateIndicatorsListQuery(url.searchParams)
    const result = await listIndicatorsUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}
