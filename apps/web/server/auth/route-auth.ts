import {
  canAccessBuilderPanel,
  canBypassVerification,
  canManageUsers,
  hasCapability,
  hasGovernanceAccess,
  hasSystemAccess,
  type Capability,
} from "@/server/auth/access-control"
import { isToolUnlocked, type ToolSlug } from "@/server/platform/tool-access"
import { getSessionUser, type SessionUser } from "@/server/auth/session"
import { getClientIp, getRequestId, jsonWithRequestId } from "@/server/platform/request-context"

type EnsureBuilderOrAdminOptions = {
  toolSlug?: ToolSlug
}

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

  if (!allowUnverified && !canBypassVerification(user.email, user.role) && !user.isVerified) {
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

export async function ensureCapability(
  capability: Capability,
  request?: Request,
  options: Omit<AuthorizationOptions, "capability"> = {},
) {
  const result = await authorizeRouteAccess(request, { ...options, capability })
  return result instanceof Response ? result : null
}

export async function ensureToolAccess(toolSlug: ToolSlug, request?: Request) {
  const result = await authorizeRouteAccess(request, { toolSlug })
  return result instanceof Response ? result : null
}

export async function ensureBuilderOrAdmin(options: EnsureBuilderOrAdminOptions = {}) {
  const result = await authorizeRouteAccess(undefined, {
    capability: "system.access",
    toolSlug: options.toolSlug,
  })
  return result instanceof Response ? result : null
}

export async function ensureAuthenticated() {
  return ensureCapability("system.access")
}

export async function ensureBuilderOnly() {
  const user = await getSessionUser()
  if (!user) {
    return jsonWithRequestId({ error: "Unauthorized" }, getRequestId(), { status: 401 })
  }

  if (user.role !== "BUILDER") {
    return jsonWithRequestId({ error: "Forbidden" }, getRequestId(), { status: 403 })
  }

  if (!user.isVerified) {
    return jsonWithRequestId({ error: "Account not approved" }, getRequestId(), { status: 403 })
  }

  return null
}

export async function ensureAdminOnly() {
  const user = await getSessionUser()
  if (!user) {
    return jsonWithRequestId({ error: "Unauthorized" }, getRequestId(), { status: 401 })
  }

  if (user.role !== "ADMIN") {
    return jsonWithRequestId({ error: "Forbidden" }, getRequestId(), { status: 403 })
  }

  return null
}

export async function ensureGovernanceUser() {
  const user = await getSessionUser()
  if (!user) {
    return jsonWithRequestId({ error: "Unauthorized" }, getRequestId(), { status: 401 })
  }

  if (!hasGovernanceAccess(user.role)) {
    return jsonWithRequestId({ error: "Forbidden" }, getRequestId(), { status: 403 })
  }

  return null
}

export async function ensureBuilderPanelAccess() {
  const user = await getSessionUser()
  if (!user) {
    return jsonWithRequestId({ error: "Unauthorized" }, getRequestId(), { status: 401 })
  }

  if (!canAccessBuilderPanel(user.email, user.role) || !canManageUsers(user.email, user.role)) {
    return jsonWithRequestId({ error: "Forbidden" }, getRequestId(), { status: 403 })
  }

  return null
}
