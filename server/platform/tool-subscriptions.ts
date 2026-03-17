import type { Role } from "@prisma/client"

export const TOOL_CATALOG = [
  {
    slug: "products",
    name: "Products",
    description: "Manage product categories and pricing.",
    path: "/dashboard/flooring/products",
  },
  {
    slug: "warehouse",
    name: "Warehouse",
    description: "Manage flooring warehouses, sections, and locations.",
    path: "/dashboard/flooring/warehouse",
  },
] as const

export type ToolSlug = (typeof TOOL_CATALOG)[number]["slug"]

export type ToolCatalogItem = {
  slug: ToolSlug
  name: string
  description: string
  path: string
}

type ToolRow = {
  id: string
  slug: string
  name: string
  description: string
  path: string
}

export type UserToolRow = ToolRow & {
  slug: ToolSlug
  isUnlocked: boolean
}

export type UserToolContext = {
  role: Role
  tools: UserToolRow[]
  canUseTools: boolean
  hasUnlimitedAccess: boolean
}

const knownToolSlugs = new Set<string>(TOOL_CATALOG.map((tool) => tool.slug))

export function isKnownToolSlug(slug: string): slug is ToolSlug {
  return knownToolSlugs.has(slug)
}

export function invalidateToolCatalogCache() {}

export async function refreshActiveToolsCatalog() {
  return TOOL_CATALOG.map((tool) => ({
    id: tool.slug,
    slug: tool.slug,
    name: tool.name,
    description: tool.description,
    path: tool.path,
  }))
}

export async function getUserToolContext({
  userId,
  role,
}: {
  userId: string
  role: Role
}): Promise<UserToolContext> {
  void userId

  const tools: UserToolRow[] = TOOL_CATALOG.map((tool) => ({
    id: tool.slug,
    slug: tool.slug,
    name: tool.name,
    description: tool.description,
    path: tool.path,
    isUnlocked: true,
  }))

  return {
    role,
    tools,
    canUseTools: true,
    hasUnlimitedAccess: true,
  }
}

export async function isToolUnlocked({
  userId,
  role,
  slug,
}: {
  userId: string
  role: Role
  slug: ToolSlug
}): Promise<boolean> {
  void userId
  void role
  void slug
  return true
}

export function getToolCatalog(): ToolCatalogItem[] {
  return [...TOOL_CATALOG]
}
