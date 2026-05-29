import { searchWorkOrderOptionsUseCase } from "@builders/application"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"
import { validateWorkOrderOptionsSearchQuery } from "../../_validators"

/**
 * GET /api/work-orders/options/search
 *
 * Warehouse-scoped async picker for the adjustment relink "Work order" dropdown.
 * Required `warehouseId` filter mirrors the adjustment's frozen warehouse
 * snapshot so users can't pick a WO in a different warehouse than the cut
 * log was stamped against.
 */
export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/work-orders/options/search",
  )
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateWorkOrderOptionsSearchQuery(url.searchParams)
    const result = await searchWorkOrderOptionsUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}
