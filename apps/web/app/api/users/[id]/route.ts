import { UserExecutionError } from "@builders/application"
import { getUserRecordById } from "@builders/db"
import { enforceManageUsersAccess } from "@/server/auth/route-auth"
import { parseRequiredString } from "@/server/http/api-helpers"
import { routeError, routeJson } from "@/server/http/route-helpers"
import { applyRoutePolicy, enforceQueryRateLimit } from "@/server/http/route-policy"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteContext) {
  const access = await applyRoutePolicy(request)
  if (access instanceof Response) return access

  const forbidden = enforceManageUsersAccess(access)
  if (forbidden) return forbidden

  const rateLimited = await enforceQueryRateLimit(request, access, "/api/users/[id]")
  if (rateLimited) return rateLimited

  try {
    const { id: rawId } = await params
    // User ids are opaque auth identifiers (Better Auth), not UUIDs.
    const id = parseRequiredString(rawId, "id")
    const user = await getUserRecordById(id)
    if (!user) {
      throw new UserExecutionError({
        code: "USER_NOT_FOUND",
        message: "User not found",
        status: 404,
      })
    }
    return routeJson(access, { user })
  } catch (error) {
    return routeError(access, error)
  }
}
