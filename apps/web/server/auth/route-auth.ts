import {
  hasCapability,
  hasSystemAccess,
  type Capability,
} from "@/server/auth/access-control"
import { isToolUnlocked, type ToolSlug } from "@/server/platform/tool-access"
import { getSessionUser, type SessionUser } from "@/server/auth/session"
import { getClientIp, getRequestId, jsonWithRequestId } from "@/server/platform/request-context"

type AuthorizationOptions = {
  capability?: Capability
  toolSlug?: ToolSlug
  allowUnverified?: boolean
}

export type AuthorizedRouteContext = {
  user: SessionUser
  requestId: string
  clientIp: string
}

export async function authorizeRouteAccess(
  request?: Request,
  { capability, toolSlug, allowUnverified = false }: AuthorizationOptions = {},
): Promise<AuthorizedRouteContext | Response> {
  const requestId = getRequestId(request)
  const clientIp = getClientIp(request)
  const user = await getSessionUser()
  if (!user) {
    return jsonWithRequestId({ error: "Unauthorized" }, requestId, { status: 401 })
  }

  if (!hasSystemAccess(user.role)) {
    return jsonWithRequestId({ error: "Forbidden" }, requestId, { status: 403 })
  }

  if (!allowUnverified && !user.isVerified) {
    return jsonWithRequestId({ error: "Account not approved" }, requestId, { status: 403 })
  }

  if (capability && !hasCapability(user.role, capability)) {
    return jsonWithRequestId({ error: "Forbidden" }, requestId, { status: 403 })
  }

  if (toolSlug && !isToolUnlocked(user.role, toolSlug)) {
    return jsonWithRequestId({ error: "Forbidden" }, requestId, { status: 403 })
  }

  return {
    user,
    requestId,
    clientIp,
  }
}
