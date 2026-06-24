import { searchEntityOptionsUseCase } from "@builders/application"
import { routeError, routeJson } from "@/server/http/route-helpers"
import {
  applyRoutePolicy,
  enforceQueryRateLimit,
} from "@/server/http/route-policy"
import { validateEntityOptionsQuery } from "../_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(
    request,
    access,
    "/api/entities/options",
  )
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateEntityOptionsQuery(url.searchParams)
    const result = await searchEntityOptionsUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}
