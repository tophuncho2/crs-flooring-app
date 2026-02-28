import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canEditRole, canRestrictUser, isMasterEmail } from "@/lib/access-control"
import { ensureBuilderOnly } from "@/lib/route-auth"

export async function GET() {
  const authError = await ensureBuilderOnly()
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
    users: users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      isMaster: isMasterEmail(user.email),
      canRestrict: canRestrictUser(user.email, user.role),
      canEditRole: canEditRole(user.email, user.role),
    })),
  })
}
