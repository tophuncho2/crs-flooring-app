import type { UserRank } from "@builders/db"
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
