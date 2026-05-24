import { listUnitOfMeasures } from "@builders/db"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/unit-of-measures")
  if (rateLimited) return rateLimited

  try {
    return routeJson(access, { unitOfMeasures: await listUnitOfMeasures() })
  } catch (error) {
    return routeError(access, error)
  }
}
