import type { Role } from "@builders/db"
import { hasCapability } from "@/server/auth/access-control"

export const TOOL_CATALOG = [
  {
    slug: "products",
    name: "Products",
    description: "Manage product categories and pricing.",
    path: "/dashboard/products",
  },
  {
    slug: "templates",
    name: "Templates",
    description: "Manage property templates and linked material/service scopes.",
    path: "/dashboard/templates",
  },
  {
    slug: "properties",
    name: "Properties",
    description: "Manage management companies, properties, and related records.",
    path: "/dashboard/properties",
  },
  {
    slug: "warehouse",
    name: "Warehouse",
    description: "Manage flooring warehouses, sections, and locations.",
    path: "/dashboard/warehouse",
  },
] as const

export type ToolSlug = (typeof TOOL_CATALOG)[number]["slug"]

export type ToolCatalogItem = {
  slug: ToolSlug
  name: string
  description: string
  path: string
}

const TOOL_ACCESS_POLICY: Record<ToolSlug, ReadonlySet<Role>> = {
  products: new Set<Role>(["OWNER", "ADMIN", "BUILDER"]),
  templates: new Set<Role>(["OWNER", "ADMIN", "BUILDER"]),
  properties: new Set<Role>(["OWNER", "ADMIN", "BUILDER"]),
  warehouse: new Set<Role>(["OWNER", "ADMIN", "BUILDER"]),
}

const knownToolSlugs = new Set<string>(TOOL_CATALOG.map((tool) => tool.slug))

export function isKnownToolSlug(slug: string): slug is ToolSlug {
  return knownToolSlugs.has(slug)
}

export function hasToolAccess(role: Role, slug: ToolSlug): boolean {
  if (!hasCapability(role, "system.access")) {
    return false
  }

  return TOOL_ACCESS_POLICY[slug].has(role)
}

export function getToolCatalog(): ToolCatalogItem[] {
  return [...TOOL_CATALOG]
}

export type UserToolRow = ToolCatalogItem & {
  id: string
  isUnlocked: boolean
}

export type UserToolContext = {
  role: Role
  tools: UserToolRow[]
  canUseTools: boolean
  hasUnlimitedAccess: boolean
}

export function getUserToolContext(role: Role): UserToolContext {
  const tools: UserToolRow[] = TOOL_CATALOG.map((tool) => ({
    id: tool.slug,
    slug: tool.slug,
    name: tool.name,
    description: tool.description,
    path: tool.path,
    isUnlocked: hasToolAccess(role, tool.slug),
  }))

  return {
    role,
    tools,
    canUseTools: hasCapability(role, "system.access"),
    hasUnlimitedAccess: hasCapability(role, "tool.admin"),
  }
}

export function isToolUnlocked(role: Role, slug: ToolSlug): boolean {
  return hasToolAccess(role, slug)
}
