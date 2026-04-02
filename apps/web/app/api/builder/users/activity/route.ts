import { listManagedUserActivity } from "@/server/builder/users"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, { capability: "users.manage" })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/builder/users/activity")
  if (rateLimited) return rateLimited

  try {
    return routeJson(access, {
      activity: await listManagedUserActivity(),
    })
  } catch (error) {
    return routeError(access, error)
  }
}
