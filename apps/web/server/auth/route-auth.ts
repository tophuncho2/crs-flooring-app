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
