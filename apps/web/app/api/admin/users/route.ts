import { isGovernanceExecutionError, listManagedUsersUseCase } from "@builders/application"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"

export async function GET(request: Request) {
  const access = await applyRoutePolicy(request, { capability: "users.manage" })
  if (access instanceof Response) return access

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/admin/users")
  if (rateLimited) return rateLimited

  try {
    const result = await listManagedUsersUseCase(access.user)
    return routeJson(access, { users: result.users })
  } catch (error) {
    if (isGovernanceExecutionError(error)) {
      return routeJson(access, { error: error.message, field: error.field }, { status: error.status })
    }
    return routeError(access, error)
  }
}
