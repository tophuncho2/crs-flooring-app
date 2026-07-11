import { authorizeRouteAccess, type AuthorizedRouteContext } from "@/server/auth/route-auth"
import { normalizePrismaError } from "@/server/http/api-helpers"
import { buildRateLimitResponse, consumeRateLimit } from "@/server/platform/rate-limit"
import { jsonWithRequestId, withRequestId } from "@/server/platform/request-context"

type RateLimitOptions = {
  scope: string
  limit: number
  windowMs: number
  identifier?: string
  route: string
}

/**
 * Resolve the authorized route context (or a 401 Response). The auth half of the
 * `applyRoutePolicy` gauntlet; called from there, not directly by handlers.
 */
export async function requireRouteAccess(
  request: Request,
): Promise<AuthorizedRouteContext | Response> {
  return authorizeRouteAccess(request)
}

/**
 * Consume a rate-limit token (or return a 429 Response). The rate-limit half of
 * the `applyRoutePolicy`/`enforceQueryRateLimit` gauntlet; called from there.
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

/**
 * Emit a CSV file download as a raw `text/csv` response with a
 * `Content-Disposition` attachment, carrying the same `x-request-id` header as
 * `routeJson` for tracing parity. Use for export endpoints; errors still go
 * through `routeError` (JSON) so the client can surface them.
 */
export function routeCsv(
  context: Pick<AuthorizedRouteContext, "requestId">,
  csv: string,
  options: { filename: string; extraHeaders?: Record<string, string> },
) {
  const headers = new Headers({
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="${options.filename}"`,
  })
  for (const [key, value] of Object.entries(options.extraHeaders ?? {})) {
    headers.set(key, value)
  }
  return withRequestId(new Response(csv, { status: 200, headers }), context.requestId)
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
