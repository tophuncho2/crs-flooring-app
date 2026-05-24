import { authorizeRouteAccess, type AuthorizedRouteContext } from "@/server/auth/route-auth"
import { normalizePrismaError } from "@/server/http/api-helpers"
import { buildRateLimitResponse, consumeRateLimit } from "@/server/platform/rate-limit"
import { jsonWithRequestId } from "@/server/platform/request-context"

type RouteAccessOptions = {
  allowUnverified?: boolean
}

type RateLimitOptions = {
  scope: string
  limit: number
  windowMs: number
  identifier?: string
  route: string
}

/**
 * @deprecated Use applyRoutePolicy() from route-policy.ts
 * @see apps/web/server/http/route-policy.ts
 */
export async function requireRouteAccess(
  request: Request,
  options: RouteAccessOptions = {},
): Promise<AuthorizedRouteContext | Response> {
  const result = await authorizeRouteAccess(request, options)
  return result
}

/**
 * @deprecated Use applyRoutePolicy() from route-policy.ts
 * @see apps/web/server/http/route-policy.ts
 */
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
  const body = normalized.field
    ? { error: normalized.message, field: normalized.field, ...(normalized.payload ?? {}) }
    : { error: normalized.message, ...(normalized.payload ?? {}) }
  return jsonWithRequestId(
    body,
    context.requestId,
    { status: normalized.status },
  )
}
