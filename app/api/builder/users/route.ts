import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canEditRole, canRestrictUser, isMasterEmail } from "@/lib/access-control"
import { ensureBuilderPanelAccess } from "@/lib/route-auth"

export async function GET() {
  const authError = await ensureBuilderPanelAccess()
  if (authError) return authError
  const session = await getServerSession(authOptions)
  const viewerIsMaster = Boolean(session?.user?.email && isMasterEmail(session.user.email))

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
    viewerIsMaster,
    users: users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      isMaster: isMasterEmail(user.email),
      canRestrict: canRestrictUser(user.email, user.role),
      canEditRole: canEditRole(user.email, user.role),
    })),
  })
}
