import { NextResponse } from "next/server"
import { prisma } from "@/server/db/prisma"
import { parseRequiredString } from "@/server/http/api-helpers"
import { getSessionUser } from "@/server/auth/session"
import { ensureGovernanceUser } from "@/server/auth/route-auth"
import { logEvent } from "@/server/platform/logger"
import { buildRateLimitResponse, consumeRateLimit } from "@/server/platform/rate-limit"
import { getClientIp, getRequestId, withRequestId } from "@/server/platform/request-context"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const requestId = getRequestId(request)
  const clientIp = getClientIp(request)
  const authError = await ensureGovernanceUser()
  if (authError) return authError
  const actor = await getSessionUser()

  if (!actor) {
    return withRequestId(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), requestId)
  }

  const rateLimit = await consumeRateLimit({
    request,
    scope: "hotkeys.update",
    identifier: actor.id,
    limit: 30,
    windowMs: 10 * 60 * 1000,
    route: "/api/hotkeys/[id]",
    userId: actor.id,
    userEmail: actor.email,
  })

  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit)
  }

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

  logEvent({
    message: "Hotkey updated",
    action: "hotkeys.update",
    route: "/api/hotkeys/[id]",
    requestId,
    userId: actor.id,
    userEmail: actor.email,
    clientIp,
    entityType: "hotkey",
    entityId: hotkey.id,
  })

  return withRequestId(
    NextResponse.json({
      hotkey: {
        ...hotkey,
        createdAt: hotkey.createdAt.toISOString(),
        updatedAt: hotkey.updatedAt.toISOString(),
      },
    }),
    requestId,
  )
}
