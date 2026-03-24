import type { Capability } from "@/server/auth/access-control"
import { requireToolAccess } from "@/server/auth/session"
import { requireRouteAccess } from "@/server/http/route-helpers"
import {
  MANAGEMENT_COMPANIES_TOOL_SLUG,
  PRODUCTS_TOOL_SLUG,
  PROPERTIES_TOOL_SLUG,
  WAREHOUSE_TOOL_SLUG,
} from "@/features/flooring/shared/access/tool-slugs"

export { PRODUCTS_TOOL_SLUG, PROPERTIES_TOOL_SLUG, MANAGEMENT_COMPANIES_TOOL_SLUG, WAREHOUSE_TOOL_SLUG }
export { TEMPLATES_TOOL_SLUG, WORK_ORDERS_TOOL_SLUG } from "@/features/flooring/shared/access/tool-slugs"

type RouteAccessOptions = {
  capability?: Capability
  allowUnverified?: boolean
}

export async function requireProductsAccess() {
  return requireToolAccess(PRODUCTS_TOOL_SLUG)
}

export async function requirePropertiesAccess() {
  return requireToolAccess(PROPERTIES_TOOL_SLUG)
}

export async function requireManagementCompaniesAccess() {
  return requireToolAccess(MANAGEMENT_COMPANIES_TOOL_SLUG)
}

export async function requireWarehouseAccess() {
  return requireToolAccess(WAREHOUSE_TOOL_SLUG)
}

export async function authorizeProductsRoute(request: Request, options: RouteAccessOptions = {}) {
  return requireRouteAccess(request, {
    capability: options.capability ?? "system.access",
    toolSlug: PRODUCTS_TOOL_SLUG,
    allowUnverified: options.allowUnverified,
  })
}

export async function authorizePropertiesRoute(request: Request, options: RouteAccessOptions = {}) {
  return requireRouteAccess(request, {
    capability: options.capability ?? "system.access",
    toolSlug: PROPERTIES_TOOL_SLUG,
    allowUnverified: options.allowUnverified,
  })
}

export async function authorizeManagementCompaniesRoute(request: Request, options: RouteAccessOptions = {}) {
  return requireRouteAccess(request, {
    capability: options.capability ?? "system.access",
    toolSlug: MANAGEMENT_COMPANIES_TOOL_SLUG,
    allowUnverified: options.allowUnverified,
  })
}

export async function authorizeWarehouseRoute(request: Request, options: RouteAccessOptions = {}) {
  return requireRouteAccess(request, {
    capability: options.capability ?? "system.access",
    toolSlug: WAREHOUSE_TOOL_SLUG,
    allowUnverified: options.allowUnverified,
  })
}
