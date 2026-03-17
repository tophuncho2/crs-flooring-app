import { NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { ensureBuilderPanelAccess } from "@/server/auth/route-auth"

export async function POST(request: Request) {
  const authError = await ensureBuilderPanelAccess()
  if (authError) return authError

  const body = (await request.json()) as { action?: "restrictAll" | "verifyAll" }

  if (body.action !== "restrictAll" && body.action !== "verifyAll") {
    return NextResponse.json({ error: "Invalid bulk action" }, { status: 400 })
  }

  if (body.action === "restrictAll") {
    const result = await prisma.user.updateMany({
      where: {},
      data: { isVerified: false },
    })

    return NextResponse.json({ success: true, updatedCount: result.count })
  }

  const result = await prisma.user.updateMany({
    where: {},
    data: { isVerified: true },
  })

  return NextResponse.json({ success: true, updatedCount: result.count })
}
