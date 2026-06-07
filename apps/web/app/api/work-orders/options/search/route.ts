import { searchWorkOrderOptionsUseCase } from "@builders/application"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"
import { validateWorkOrderOptionsSearchQuery } from "../../_validators"

/**
 * GET /api/work-orders/options/search
 *
 * Async picker for the adjustment relink "Work order" dropdown. Not
 * warehouse-scoped and not status-scoped: adjustments cross-source inventory
 * across warehouses, so the picker offers WOs from any warehouse and any
 * status (completed included). An optional `productId` filter still narrows
 * to WOs carrying that product when supplied.
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
