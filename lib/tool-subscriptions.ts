import { Prisma, type Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export const TOOL_CATALOG = [
  {
    slug: "products",
    name: "Products",
    description: "Manage product categories and pricing.",
    path: "/dashboard/flooring/products",
    defaultMonthlyPriceCents: 1800,
  },
  {
    slug: "vendors",
    name: "Vendors",
    description: "Manage vendor details and contact information.",
    path: "/dashboard/vendors",
    defaultMonthlyPriceCents: 1500,
  },
  {
    slug: "warehouse",
    name: "Warehouse",
    description: "Manage flooring warehouses, sections, and locations.",
    path: "/dashboard/warehouse",
    defaultMonthlyPriceCents: 1400,
  },
] as const

export type ToolSlug = (typeof TOOL_CATALOG)[number]["slug"]

export type ToolCatalogItem = {
  slug: ToolSlug
  name: string
  description: string
  path: string
  defaultMonthlyPriceCents: number
}

type ToolRowWithPrice = {
  id: string
  slug: string
  name: string
  description: string
  monthlyPriceCents: number
  isActive: boolean
  path: string
}

export type UserToolRow = ToolRowWithPrice & {
  slug: ToolSlug
  isUnlocked: boolean
}

export type UserToolContext = {
  role: Role
  tools: UserToolRow[]
  monthlyCostCents: number
  canUseTools: boolean
  hasUnlimitedAccess: boolean
  isTrialActive: boolean
  trialDaysRemaining: number
  trialEndsAt: string | null
}

const TRIAL_DAYS = 7

const DAYS_IN_MS = 24 * 60 * 60 * 1000

type ToolMetaRow = {
  id: string
  slug: string
  name: string
  description: string
  monthlyPriceCents: number
  isActive: boolean
  path: string
}

const FALLBACK_TOOL_ROWS: ToolMetaRow[] = TOOL_CATALOG.map((tool) => ({
  id: `${tool.slug}-fallback`,
  slug: tool.slug,
  name: tool.name,
  description: tool.description,
  monthlyPriceCents: tool.defaultMonthlyPriceCents,
  isActive: true,
  path: tool.path,
}))

const defaultMap = new Map<string, number>(
  TOOL_CATALOG.map((tool) => [tool.slug, tool.defaultMonthlyPriceCents]),
)

const knownToolSlugs = new Set<string>(TOOL_CATALOG.map((tool) => tool.slug))
let cachedActiveTools: ToolMetaRow[] | null = null

export function isKnownToolSlug(slug: string): slug is ToolSlug {
  return knownToolSlugs.has(slug)
}

function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function toolCentsToDisplay(cents: number): string {
  return centsToDisplay(cents)
}

function toPriceCents(raw: number | null | undefined, slug: string): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return raw
  }

  return defaultMap.get(slug) ?? 0
}

function isPaidRole(role: Role) {
  return role === "BUILDER" || role === "ADMIN"
}

function getTrialEndsAt(rawCreatedAt: string | Date): Date {
  const createdAt = new Date(rawCreatedAt)
  const trialEndsAt = new Date(createdAt)
  trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + TRIAL_DAYS)
  return trialEndsAt
}

function getTrialState(createdAt: Date | null | undefined) {
  if (!createdAt) {
    return {
      isTrialActive: false,
      trialDaysRemaining: 0,
      trialEndsAt: null,
    }
  }

  const trialEndsAt = getTrialEndsAt(createdAt)
  const remainingMs = trialEndsAt.getTime() - Date.now()
  const trialDaysRemaining = Math.max(0, Math.ceil(remainingMs / DAYS_IN_MS))

  return {
    isTrialActive: remainingMs > 0,
    trialDaysRemaining,
    trialEndsAt: trialEndsAt.toISOString(),
  }
}

function isMissingToolTableError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021"
}

export function invalidateToolCatalogCache() {
  cachedActiveTools = null
}

async function syncToolCatalog() {
  try {
    await Promise.all(
      TOOL_CATALOG.map((tool) =>
        prisma.tool.upsert({
          where: { slug: tool.slug },
          create: {
            slug: tool.slug,
            name: tool.name,
            description: tool.description,
            path: tool.path,
            monthlyPriceCents: tool.defaultMonthlyPriceCents,
            isActive: true,
          },
          update: {
            name: tool.name,
            description: tool.description,
            path: tool.path,
            monthlyPriceCents: tool.defaultMonthlyPriceCents,
          },
        }),
      ),
    )
  } catch (error) {
    if (isMissingToolTableError(error)) {
      return false
    }
    throw error
  }

  return true
}

async function loadActiveToolsFromDb(): Promise<ToolMetaRow[]> {
  const hasToolTable = await syncToolCatalog()
  if (!hasToolTable) {
    return FALLBACK_TOOL_ROWS
  }

  try {
    return await prisma.tool.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        monthlyPriceCents: true,
        isActive: true,
        path: true,
      },
    })
  } catch (error) {
    if (isMissingToolTableError(error)) {
      return FALLBACK_TOOL_ROWS
    }
    throw error
  }
}

async function getActiveToolsFromCatalog(forceRefresh = false) {
  if (!forceRefresh && cachedActiveTools) {
    return cachedActiveTools
  }

  const rows = await loadActiveToolsFromDb()
  cachedActiveTools = rows
  return rows
}

export async function refreshActiveToolsCatalog() {
  const rows = await getActiveToolsFromCatalog(true)
  return rows
}

async function getUserCreatedAt(userId: string): Promise<Date | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  })

  return user?.createdAt ?? null
}

export async function getUserToolContext({
  userId,
  role,
}: {
  userId: string
  role: Role
}): Promise<UserToolContext> {
  const userCreatedAt = await getUserCreatedAt(userId)
  const trialState = getTrialState(userCreatedAt)
  const hasUnlimitedAccess = isPaidRole(role) || trialState.isTrialActive

  const activeTools = await getActiveToolsFromCatalog()

  const unlockedToolIds = hasUnlimitedAccess
    ? new Set<string>()
    : await (async () => {
        try {
          const rows = await prisma.userToolAccess.findMany({
            where: { userId, isActive: true },
            select: { toolId: true },
          })
          return new Set(rows.map((row) => row.toolId))
        } catch (error) {
          if (isMissingToolTableError(error)) {
            return new Set<string>()
          }
          throw error
        }
      })()

  const tools: UserToolRow[] = activeTools
    .map((tool) => {
      if (!isKnownToolSlug(tool.slug)) {
        return null
      }

      return {
        ...tool,
        slug: tool.slug,
        monthlyPriceCents: toPriceCents(tool.monthlyPriceCents, tool.slug),
        isUnlocked: hasUnlimitedAccess || unlockedToolIds.has(tool.id),
      }
    })
    .filter((tool): tool is UserToolRow => Boolean(tool))

  const unlockedTools = tools.filter((tool) => tool.isUnlocked)
  const monthlyCostCents = hasUnlimitedAccess
    ? 0
    : unlockedTools.reduce((total, tool) => total + tool.monthlyPriceCents, 0)

  return {
    role,
    tools,
    monthlyCostCents,
    canUseTools: hasUnlimitedAccess || unlockedTools.length > 0,
    hasUnlimitedAccess,
    isTrialActive: trialState.isTrialActive,
    trialDaysRemaining: trialState.trialDaysRemaining,
    trialEndsAt: trialState.trialEndsAt,
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
  if (isPaidRole(role)) {
    return true
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  })

  if (!user) {
    return false
  }

  const trialState = getTrialState(user.createdAt)
  if (trialState.isTrialActive) {
    return true
  }

  try {
    const access = await prisma.userToolAccess.findFirst({
      where: {
        userId,
        isActive: true,
        tool: {
          slug,
          isActive: true,
        },
      },
    })

    return Boolean(access)
  } catch (error) {
    if (isMissingToolTableError(error)) {
      return false
    }
    throw error
  }
}

export function getToolCatalog(): ToolCatalogItem[] {
  return [...TOOL_CATALOG]
}
