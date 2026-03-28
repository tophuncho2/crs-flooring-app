import { hasCapability, type Capability } from "@/server/auth/access-control"
import type { Role } from "@builders/db"
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
    capability: options.capability ?? "workOrders.read",
    toolSlug: WORK_ORDERS_TOOL_SLUG,
    allowUnverified: options.allowUnverified,
  })
}

export function buildWorkOrderCapabilityFlags(role: Role) {
  return {
    canWrite: hasCapability(role, "workOrders.write"),
    canDelete: hasCapability(role, "workOrders.delete"),
    canAllocate: hasCapability(role, "workOrders.allocate"),
    canSyncTemplate: hasCapability(role, "workOrders.syncTemplate"),
    canGenerateInvoice: hasCapability(role, "workOrders.invoiceGenerate"),
  }
}
