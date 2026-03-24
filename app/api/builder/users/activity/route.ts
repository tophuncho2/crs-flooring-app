import { listManagedUserActivity } from "@/server/builder/users"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy } from "@/server/http/route-policy"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, { capability: "users.manage" })
  if (access instanceof Response) return access

  try {
    return routeJson(access, {
      activity: await listManagedUserActivity(),
    })
  } catch (error) {
    return routeError(access, error)
  }
}
