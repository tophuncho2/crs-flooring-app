import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ensureAuthenticated } from "@/lib/route-auth"

const DASHBOARD_HOTKEY_ID = "46dfb2cd-3010-49fc-8a2c-59e436020007"

async function ensureDashboardHotkey() {
  await prisma.hotkey.upsert({
    where: { id: DASHBOARD_HOTKEY_ID },
    update: {
      key: "Dashboard",
      combination: "SHIFT + SPACE",
      action: "Open Dashboard",
    },
    create: {
      id: DASHBOARD_HOTKEY_ID,
      key: "Dashboard",
      combination: "SHIFT + SPACE",
      action: "Open Dashboard",
    },
  })
}

export async function GET() {
  const authError = await ensureAuthenticated()
  if (authError) return authError

  await ensureDashboardHotkey()

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
