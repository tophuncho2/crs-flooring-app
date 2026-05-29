import { listAdjustmentsUseCase } from "@builders/application"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { validateAdjustmentsListQuery } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/adjustments")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateAdjustmentsListQuery(url.searchParams)
    const result = await listAdjustmentsUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}
