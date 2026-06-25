import { listUnitOfMeasuresUseCase } from "@builders/application"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"
import { validateListUnitOfMeasuresQuery } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/unit-of-measures")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListUnitOfMeasuresQuery(url.searchParams)
    const result = await listUnitOfMeasuresUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}
