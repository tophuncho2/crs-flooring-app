import type { UserRank } from "@builders/db"
import { hasRankAtLeast, USER_MANAGEMENT_MIN_RANK } from "@builders/domain"
import { getSessionUser, type SessionUser } from "@/server/auth/session"
import { getClientIp, getRequestId, jsonWithRequestId } from "@/server/platform/request-context"

export type AuthorizedRouteContext = {
  user: SessionUser
  requestId: string
  clientIp: string
}

export async function authorizeRouteAccess(
  request?: Request,
): Promise<AuthorizedRouteContext | Response> {
  const requestId = getRequestId(request)
  const clientIp = getClientIp(request)
  const user = await getSessionUser()
  if (!user) {
    return jsonWithRequestId({ error: "Unauthorized" }, requestId, { status: 401 })
  }

  return {
    user,
    requestId,
    clientIp,
  }
}

/**
 * Generic route rank guard. Returns `null` to let the handler proceed when the
 * authorized caller ranks at or above `minimum`, else a 403 Response. The
 * reusable seam every module-level API rank gate hooks into.
 */
export function enforceRankAtLeast(
  access: AuthorizedRouteContext,
  minimum: UserRank,
): Response | null {
  if (hasRankAtLeast(access.user.rank, minimum)) {
    return null
  }

  return jsonWithRequestId({ error: "Forbidden" }, access.requestId, { status: 403 })
}

/**
 * Route guard for the user-management endpoints. DEVELOPER + TIER_1 pass. Thin
 * wrapper over `enforceRankAtLeast`.
 */
export function enforceManageUsersAccess(access: AuthorizedRouteContext): Response | null {
  return enforceRankAtLeast(access, USER_MANAGEMENT_MIN_RANK)
}
