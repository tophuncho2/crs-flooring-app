import { NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { canManageUsers } from "@/server/auth/access-control"
import { getSessionUser } from "@/server/auth/session"
import { normalizeManagedUserRow } from "@/server/auth/user-governance"
import { ensureBuilderPanelAccess } from "@/server/auth/route-auth"

export async function GET() {
  const authError = await ensureBuilderPanelAccess()
  if (authError) return authError
  const actor = await getSessionUser()

  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    where: {
      role: "BUILDER",
    },
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
    viewerCanManageUsers: canManageUsers(actor.email, actor.role),
    users: users.map((user) => normalizeManagedUserRow(user, actor)),
  })
}
