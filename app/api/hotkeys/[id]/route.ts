import { NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { parseRequiredString } from "@/server/http/api-helpers"
import { ensureBuilderOnly } from "@/server/auth/route-auth"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authError = await ensureBuilderOnly()
  if (authError) return authError

  const body = (await request.json()) as Record<string, unknown>
  const { id } = await params

  const hotkey = await prisma.hotkey.update({
    where: { id },
    data: {
      key: parseRequiredString(body.key, "key"),
      combination: parseRequiredString(body.combination, "combination"),
      action: parseRequiredString(body.action, "action"),
    },
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
    hotkey: {
      ...hotkey,
      createdAt: hotkey.createdAt.toISOString(),
      updatedAt: hotkey.updatedAt.toISOString(),
    },
  })
}
