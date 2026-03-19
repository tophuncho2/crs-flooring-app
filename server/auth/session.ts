import type { Role } from "@prisma/client"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/server/auth/auth-options"
import { isToolUnlocked, type ToolSlug } from "@/server/platform/tool-subscriptions"

export type SessionUser = {
  id: string
  email: string
  role: Role
  isVerified: boolean
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  const { user } = session ?? {}

  if (!user?.id || !user.email || !user.role) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  return user
}

export async function requireToolAccess(slug: ToolSlug): Promise<SessionUser> {
  const user = await requireSessionUser()

  if (!(await isToolUnlocked({ userId: user.id, role: user.role, slug }))) {
    redirect("/dashboard/flooring/work-orders")
  }

  return user
}
