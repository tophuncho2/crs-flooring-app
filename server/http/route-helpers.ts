import type { Capability } from "@/server/auth/access-control"
import { authorizeRouteAccess, type AuthorizedRouteContext } from "@/server/auth/route-auth"
import { normalizePrismaError } from "@/server/http/api-helpers"
import { logEvent } from "@/server/platform/logger"
import { buildRateLimitResponse, consumeRateLimit } from "@/server/platform/rate-limit"
import { jsonWithRequestId } from "@/server/platform/request-context"
import type { ToolSlug } from "@/server/platform/tool-access"

type RouteAccessOptions = {
  capability?: Capability
  toolSlug?: ToolSlug
  allowUnverified?: boolean
}

type RateLimitOptions = {
  scope: string
  limit: number
  windowMs: number
  identifier?: string
  route: string
}

type MutationLogOptions = {
  message: string
  action: string
  route: string
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
}

export async function requireRouteAccess(
  request: Request,
  options: RouteAccessOptions = {},
): Promise<AuthorizedRouteContext | Response> {
  const result = await authorizeRouteAccess(request, options)
  return result
}

export async function enforceRouteRateLimit(
  request: Request,
  context: AuthorizedRouteContext,
  options: RateLimitOptions,
): Promise<Response | null> {
  const rateLimit = await consumeRateLimit({
    request,
    scope: options.scope,
    identifier: options.identifier ?? context.user.id,
    limit: options.limit,
    windowMs: options.windowMs,
    route: options.route,
    userId: context.user.id,
    userEmail: context.user.email,
  })

  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit)
  }

  return null
}

export function routeJson(context: AuthorizedRouteContext, body: unknown, init?: ResponseInit) {
  return jsonWithRequestId(body, context.requestId, init)
}

export function routeError(context: Pick<AuthorizedRouteContext, "requestId">, error: unknown) {
  const normalized = normalizePrismaError(error)
  return jsonWithRequestId({ error: normalized.message }, context.requestId, { status: normalized.status })
}

export function logRouteMutationSuccess(
  context: AuthorizedRouteContext,
  { message, action, route, entityType, entityId, details }: MutationLogOptions,
) {
  logEvent({
    message,
    action,
    route,
    requestId: context.requestId,
    userId: context.user.id,
    userEmail: context.user.email,
    clientIp: context.clientIp,
    entityType,
    entityId,
    details,
  })
}

export function logRouteMutationFailure(
  context: AuthorizedRouteContext,
  {
    message,
    action,
    route,
    entityType,
    entityId,
    details,
  }: MutationLogOptions,
  error: unknown,
) {
  logEvent({
    level: "error",
    message,
    action,
    route,
    requestId: context.requestId,
    userId: context.user.id,
    userEmail: context.user.email,
    clientIp: context.clientIp,
    entityType,
    entityId,
    details,
    error,
  })
}
