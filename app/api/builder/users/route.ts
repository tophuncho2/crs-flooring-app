import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/server/auth/auth-options"
import { prisma } from "@/server/db/prisma"
import { canEditRole, canRestrictUser, isMasterEmail } from "@/server/auth/access-control"
import { ensureBuilderPanelAccess } from "@/server/auth/route-auth"

export async function GET() {
  const authError = await ensureBuilderPanelAccess()
  if (authError) return authError
  const session = await getServerSession(authOptions)
  const viewerCanManageUsers = Boolean(session?.user?.email)

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    viewerCanManageUsers,
    users: users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      isMaster: isMasterEmail(user.email),
      canRestrict: canRestrictUser(user.email, user.role),
      canEditRole: canEditRole(user.email, user.role),
    })),
  })
}
