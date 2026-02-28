import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ensureAuthenticated } from "@/lib/route-auth"

export async function GET() {
  const authError = await ensureAuthenticated()
  if (authError) return authError

  const hotkeys = await prisma.hotkey.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      key: true,
      combination: true,
      action: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json({
    hotkeys: hotkeys.map((hotkey) => ({
      ...hotkey,
      createdAt: hotkey.createdAt.toISOString(),
      updatedAt: hotkey.updatedAt.toISOString(),
    })),
  })
}
