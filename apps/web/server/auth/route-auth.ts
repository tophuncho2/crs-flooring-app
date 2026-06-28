import { canManageUsers } from "@builders/domain"
import { getSessionUser, type SessionUser } from "@/server/auth/session"
import { getClientIp, getRequestId, jsonWithRequestId } from "@/server/platform/request-context"

type AuthorizationOptions = {
  allowUnverified?: boolean
}

export type AuthorizedRouteContext = {
  user: SessionUser
  requestId: string
  clientIp: string
}

export async function authorizeRouteAccess(
  request?: Request,
  { allowUnverified = false }: AuthorizationOptions = {},
): Promise<AuthorizedRouteContext | Response> {
  const requestId = getRequestId(request)
  const clientIp = getClientIp(request)
  const user = await getSessionUser()
  if (!user) {
    return jsonWithRequestId({ error: "Unauthorized" }, requestId, { status: 401 })
  }

  if (!allowUnverified && !user.isVerified) {
    return jsonWithRequestId({ error: "Account not approved" }, requestId, { status: 403 })
  }

  return {
    user,
    requestId,
    clientIp,
  }
}

/**
 * Route guard for the user-management endpoints. Returns a 403 Response when the
 * authorized caller ranks below the management threshold (TIER_2/TIER_3), or
 * `null` to let the handler proceed. DEVELOPER + TIER_1 pass.
 */
export function enforceManageUsersAccess(access: AuthorizedRouteContext): Response | null {
  if (canManageUsers(access.user.rank)) {
    return null
  }

  return jsonWithRequestId({ error: "Forbidden" }, access.requestId, { status: 403 })
}
