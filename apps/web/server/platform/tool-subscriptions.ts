import type { Role } from "@builders/db"
import { hasCapability } from "@/server/auth/access-control"
import {
  getToolCatalog as getStaticToolCatalog,
  hasToolAccess,
  isKnownToolSlug,
  TOOL_CATALOG,
  type ToolCatalogItem,
  type ToolSlug,
} from "@/server/platform/tool-access"
export { isKnownToolSlug }
export type { ToolCatalogItem, ToolSlug } from "@/server/platform/tool-access"

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
    isUnlocked: hasToolAccess(role, tool.slug),
  }))

  return {
    role,
    tools,
    canUseTools: hasCapability(role, "system.access"),
    hasUnlimitedAccess: hasCapability(role, "tool.admin"),
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
  return hasToolAccess(role, slug)
}

export function getToolCatalog(): ToolCatalogItem[] {
  return getStaticToolCatalog()
}
