import { NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { ensureBuilderPanelAccess } from "@/server/auth/route-auth"

export async function GET() {
  const authError = await ensureBuilderPanelAccess()
  if (authError) return authError

  const activity = await prisma.userLoginActivity.findMany({
    orderBy: { loggedInAt: "desc" },
    take: 200,
    select: {
      id: true,
      userEmail: true,
      loggedInAt: true,
    },
  })

  return NextResponse.json({
    activity: activity.map((row) => ({
      ...row,
      loggedInAt: row.loggedInAt.toISOString(),
    })),
  })
}
