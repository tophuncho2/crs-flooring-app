import { listUsersUseCase } from "@builders/application"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"
import { validateListUsersQuery } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/users")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListUsersQuery(url.searchParams)
    const result = await listUsersUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}
