import type { Capability } from "@/server/auth/access-control"
import type { AuthorizedRouteContext } from "@/server/auth/route-auth"
import { enforceRouteRateLimit, requireRouteAccess } from "@/server/http/route-helpers"
import type { ToolSlug } from "@/server/platform/tool-subscriptions"

export type RoutePolicy = {
  capability?: Capability
  toolSlug?: ToolSlug
  allowUnverified?: boolean
  rateLimit?: {
    scope: string
    limit: number
    windowMs: number
    route: string
    identifier?: string | ((context: AuthorizedRouteContext) => string)
  }
}

export async function applyRoutePolicy(
  request: Request,
  policy: RoutePolicy = {},
): Promise<AuthorizedRouteContext | Response> {
  const access = await requireRouteAccess(request, {
    capability: policy.capability,
    toolSlug: policy.toolSlug,
    allowUnverified: policy.allowUnverified,
  })

  if (access instanceof Response) {
    return access
  }

  if (!policy.rateLimit) {
    return access
  }

  const rateLimitResponse = await enforceRouteRateLimit(request, access, {
    scope: policy.rateLimit.scope,
    limit: policy.rateLimit.limit,
    windowMs: policy.rateLimit.windowMs,
    route: policy.rateLimit.route,
    identifier:
      typeof policy.rateLimit.identifier === "function"
        ? policy.rateLimit.identifier(access)
        : policy.rateLimit.identifier,
  })

  if (rateLimitResponse) {
    return rateLimitResponse
  }

  return access
}
