import { NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { ensureBuilderPanelAccess } from "@/server/auth/route-auth"

export async function GET() {
  const authError = await ensureBuilderPanelAccess()
  if (authError) return authError

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
    viewerCanManageUsers: true,
    users: users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      canRestrict: true,
      canEditRole: true,
    })),
  })
}
