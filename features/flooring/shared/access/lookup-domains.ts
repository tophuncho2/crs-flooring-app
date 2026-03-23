import type { Capability } from "@/server/auth/access-control"
import { requireToolAccess } from "@/server/auth/session"
import { requireRouteAccess } from "@/server/http/route-helpers"

export const CATEGORIES_TOOL_SLUG = "products" as const
export const CONTACTS_TOOL_SLUG = "warehouse" as const
export const MANUFACTURERS_TOOL_SLUG = "products" as const
export const UNIT_OF_MEASURES_TOOL_SLUG = "products" as const
export const SERVICES_TOOL_SLUG = "warehouse" as const

type RouteAccessOptions = {
  capability?: Capability
  allowUnverified?: boolean
}

export async function requireCategoriesAccess() {
  return requireToolAccess(CATEGORIES_TOOL_SLUG)
}

export async function requireContactsAccess() {
  return requireToolAccess(CONTACTS_TOOL_SLUG)
}

export async function requireManufacturersAccess() {
  return requireToolAccess(MANUFACTURERS_TOOL_SLUG)
}

export async function requireServicesAccess() {
  return requireToolAccess(SERVICES_TOOL_SLUG)
}

export async function requireUnitOfMeasuresAccess() {
  return requireToolAccess(UNIT_OF_MEASURES_TOOL_SLUG)
}

export async function authorizeCategoriesRoute(request: Request, options: RouteAccessOptions = {}) {
  return requireRouteAccess(request, {
    capability: options.capability ?? "system.access",
    toolSlug: CATEGORIES_TOOL_SLUG,
    allowUnverified: options.allowUnverified,
  })
}

export async function authorizeContactsRoute(request: Request, options: RouteAccessOptions = {}) {
  return requireRouteAccess(request, {
    capability: options.capability ?? "system.access",
    toolSlug: CONTACTS_TOOL_SLUG,
    allowUnverified: options.allowUnverified,
  })
}

export async function authorizeManufacturersRoute(request: Request, options: RouteAccessOptions = {}) {
  return requireRouteAccess(request, {
    capability: options.capability ?? "system.access",
    toolSlug: MANUFACTURERS_TOOL_SLUG,
    allowUnverified: options.allowUnverified,
  })
}

export async function authorizeServicesRoute(request: Request, options: RouteAccessOptions = {}) {
  return requireRouteAccess(request, {
    capability: options.capability ?? "system.access",
    toolSlug: SERVICES_TOOL_SLUG,
    allowUnverified: options.allowUnverified,
  })
}

export async function authorizeUnitOfMeasuresRoute(request: Request, options: RouteAccessOptions = {}) {
  return requireRouteAccess(request, {
    capability: options.capability ?? "system.access",
    toolSlug: UNIT_OF_MEASURES_TOOL_SLUG,
    allowUnverified: options.allowUnverified,
  })
}
