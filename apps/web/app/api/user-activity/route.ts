import { listUserLoginActivityUseCase } from "@builders/application"
import { enforceManageUsersAccess } from "@/server/auth/route-auth"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"
import { validateListUserActivityQuery } from "./_validators"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const forbidden = enforceManageUsersAccess(access)
  if (forbidden) return forbidden

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/user-activity")
  if (rateLimited) return rateLimited

  try {
    const url = new URL(request.url)
    const input = validateListUserActivityQuery(url.searchParams)
    const result = await listUserLoginActivityUseCase(input)
    return routeJson(access, result)
  } catch (error) {
    return routeError(access, error)
  }
}
