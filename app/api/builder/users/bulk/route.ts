import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { MASTER_EMAIL_LIST } from "@/lib/access-control"
import { ensureBuilderPanelAccess } from "@/lib/route-auth"

export async function POST(request: Request) {
  const authError = await ensureBuilderPanelAccess()
  if (authError) return authError

  const body = (await request.json()) as { action?: "restrictAll" | "verifyAll" }

  if (body.action !== "restrictAll" && body.action !== "verifyAll") {
    return NextResponse.json({ error: "Invalid bulk action" }, { status: 400 })
  }

  if (body.action === "restrictAll") {
    const result = await prisma.user.updateMany({
      where: {
        email: { notIn: [...MASTER_EMAIL_LIST] },
      },
      data: { isVerified: false },
    })

    return NextResponse.json({ success: true, updatedCount: result.count })
  }

  const result = await prisma.user.updateMany({
    where: {
      email: { notIn: [...MASTER_EMAIL_LIST] },
    },
    data: { isVerified: true },
  })

  return NextResponse.json({ success: true, updatedCount: result.count })
}
