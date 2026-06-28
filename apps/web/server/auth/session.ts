import type { UserRank } from "@builders/db"
import { canManageUsers } from "@builders/domain"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { getAuthOptions } from "@/server/auth/auth-options"

export type SessionUser = {
  id: string
  email: string
  rank: UserRank
  isVerified: boolean
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(getAuthOptions())
  const { user } = session ?? {}

  if (!user?.id || !user.email || !user.rank) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    rank: user.rank,
    isVerified: user.isVerified,
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  if (!user.isVerified) {
    redirect("/login?restricted=1")
  }

  return user
}

/**
 * Page-loader guard for the user-management area (Users, Login Activity). Builds
 * on `requireSessionUser` (login + approval), then redirects ranks below the
 * management threshold away to the default dashboard. DEVELOPER + TIER_1 pass.
 */
export async function requireManageUsersAccess(): Promise<SessionUser> {
  const user = await requireSessionUser()

  if (!canManageUsers(user.rank)) {
    redirect("/dashboard/inventory")
  }

  return user
}
