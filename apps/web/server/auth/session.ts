import type { UserRank } from "@builders/db"
import { hasRankAtLeast, USER_MANAGEMENT_MIN_RANK } from "@builders/domain"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/server/auth/better-auth"
import { DEFAULT_DASHBOARD_ROUTE } from "@/hooks/navigation"

export type SessionUser = {
  id: string
  email: string
  rank: UserRank
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user as
    | { id?: string; email?: string; rank?: string }
    | undefined

  if (!user?.id || !user.email || !user.rank) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    rank: user.rank as UserRank,
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  return user
}

/**
 * Generic page-loader rank guard. Builds on `requireSessionUser`, then redirects
 * any rank below `minimum` away to the default dashboard. The reusable seam every
 * module-level rank gate hooks into (Users, Payments, Job Types, …).
 */
export async function requireRankAtLeast(minimum: UserRank): Promise<SessionUser> {
  const user = await requireSessionUser()

  if (!hasRankAtLeast(user.rank, minimum)) {
    redirect(DEFAULT_DASHBOARD_ROUTE)
  }

  return user
}

/**
 * Page-loader guard for the user-management area (Users, Login Activity).
 * DEVELOPER + TIER_1 pass. Thin wrapper over `requireRankAtLeast`.
 */
export async function requireManageUsersAccess(): Promise<SessionUser> {
  return requireRankAtLeast(USER_MANAGEMENT_MIN_RANK)
}
