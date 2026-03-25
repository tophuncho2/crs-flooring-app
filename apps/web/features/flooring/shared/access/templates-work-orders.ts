import type { Capability } from "@/server/auth/access-control"
import { requireToolAccess } from "@/server/auth/session"
import { requireRouteAccess } from "@/server/http/route-helpers"
import { TEMPLATES_TOOL_SLUG, WORK_ORDERS_TOOL_SLUG } from "./domain-tools"

type RouteAccessOptions = {
  capability?: Capability
  allowUnverified?: boolean
}

export async function requireTemplatesAccess() {
  return requireToolAccess(TEMPLATES_TOOL_SLUG)
}

export async function requireWorkOrdersAccess() {
  return requireToolAccess(WORK_ORDERS_TOOL_SLUG)
}

export async function authorizeTemplatesRoute(request: Request, options: RouteAccessOptions = {}) {
  return requireRouteAccess(request, {
    capability: options.capability ?? "system.access",
    toolSlug: TEMPLATES_TOOL_SLUG,
    allowUnverified: options.allowUnverified,
  })
}

export async function authorizeWorkOrdersRoute(request: Request, options: RouteAccessOptions = {}) {
  return requireRouteAccess(request, {
    capability: options.capability ?? "system.access",
    toolSlug: WORK_ORDERS_TOOL_SLUG,
    allowUnverified: options.allowUnverified,
  })
}
