import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { MASTER_EMAIL } from "@/lib/access-control"
import { ensureBuilderOnly } from "@/lib/route-auth"

export async function POST(request: Request) {
  const authError = await ensureBuilderOnly()
  if (authError) return authError

  const body = (await request.json()) as { action?: "restrictAll" | "verifyAll" }

  if (body.action !== "restrictAll" && body.action !== "verifyAll") {
    return NextResponse.json({ error: "Invalid bulk action" }, { status: 400 })
  }

  if (body.action === "restrictAll") {
    const result = await prisma.user.updateMany({
      where: {
        role: { not: "BUILDER" },
        email: { not: MASTER_EMAIL },
      },
      data: { isVerified: false },
    })

    return NextResponse.json({ success: true, updatedCount: result.count })
  }

  const result = await prisma.user.updateMany({
    where: {
      role: { not: "BUILDER" },
    },
    data: { isVerified: true },
  })

  return NextResponse.json({ success: true, updatedCount: result.count })
}
