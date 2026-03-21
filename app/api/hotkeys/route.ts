import { NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { ensureAuthenticated } from "@/server/auth/route-auth"
import { FLOORING_HOTKEYS } from "@/server/flooring/hotkeys"

async function syncHotkeys() {
  const allowedIds = new Set(FLOORING_HOTKEYS.map((hotkey) => hotkey.id))

  await prisma.$transaction([
    prisma.hotkey.deleteMany({
      where: {
        id: {
          notIn: Array.from(allowedIds),
        },
      },
    }),
    ...FLOORING_HOTKEYS.map((hotkey) =>
      prisma.hotkey.upsert({
        where: { id: hotkey.id },
        update: {
          key: hotkey.key,
          combination: hotkey.combination,
          action: hotkey.action,
        },
        create: {
          id: hotkey.id,
          key: hotkey.key,
          combination: hotkey.combination,
          action: hotkey.action,
        },
      }),
    ),
  ])
}

export async function GET() {
  const authError = await ensureAuthenticated()
  if (authError) return authError

  await syncHotkeys()

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

  const hotkeysById = new Map(hotkeys.map((hotkey) => [hotkey.id, hotkey]))

  return NextResponse.json({
    hotkeys: FLOORING_HOTKEYS.map((definition) => hotkeysById.get(definition.id))
      .filter((hotkey): hotkey is NonNullable<typeof hotkeys[number]> => Boolean(hotkey))
      .map((hotkey) => ({
        ...hotkey,
        createdAt: hotkey.createdAt.toISOString(),
        updatedAt: hotkey.updatedAt.toISOString(),
      })),
  })
}
