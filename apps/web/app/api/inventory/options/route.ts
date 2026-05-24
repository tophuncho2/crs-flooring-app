import { listInventoryOptions } from "@builders/db"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"
import { routeError, routeJson } from "@/server/http/route-helpers"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/inventory/options")
  if (rateLimited) return rateLimited

  try {
    return routeJson(access, await listInventoryOptions())
  } catch (error) {
    return routeError(access, error)
  }
}
