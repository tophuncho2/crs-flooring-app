import { prisma } from "@/server/db/prisma"
import { getSessionUser } from "@/server/auth/session"
import { ensureBuilderPanelAccess } from "@/server/auth/route-auth"
import { logEvent } from "@/server/platform/logger"
import { buildRateLimitResponse, consumeRateLimit } from "@/server/platform/rate-limit"
import { getClientIp, getRequestId, jsonWithRequestId } from "@/server/platform/request-context"

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  const clientIp = getClientIp(request)
  const authError = await ensureBuilderPanelAccess()
  if (authError) return authError
  const actor = await getSessionUser()

  if (!actor) {
    return jsonWithRequestId({ error: "Unauthorized" }, requestId, { status: 401 })
  }

  const rateLimit = await consumeRateLimit({
    request,
    scope: "users.bulk",
    identifier: actor.id,
    limit: 10,
    windowMs: 10 * 60 * 1000,
    route: "/api/builder/users/bulk",
    userId: actor.id,
    userEmail: actor.email,
  })

  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit)
  }

  const body = (await request.json()) as { action?: "restrictAll" | "verifyAll" }

  if (body.action !== "restrictAll" && body.action !== "verifyAll") {
    return jsonWithRequestId({ error: "Invalid bulk action" }, requestId, { status: 400 })
  }

  if (body.action === "restrictAll") {
    const result = await prisma.user.updateMany({
      where: {
        role: "BUILDER",
      },
      data: { isVerified: false },
    })

    logEvent({
      message: "Bulk builder restriction completed",
      action: "users.bulk.restrictAll",
      route: "/api/builder/users/bulk",
      requestId,
      userId: actor.id,
      userEmail: actor.email,
      clientIp,
      details: {
        updatedCount: result.count,
      },
    })

    return jsonWithRequestId({ success: true, updatedCount: result.count }, requestId)
  }

  const result = await prisma.user.updateMany({
    where: {
      role: "BUILDER",
    },
    data: { isVerified: true },
  })

  logEvent({
    message: "Bulk verification completed",
    action: "users.bulk.verifyAll",
    route: "/api/builder/users/bulk",
    requestId,
    userId: actor.id,
    userEmail: actor.email,
    clientIp,
    details: {
      updatedCount: result.count,
    },
  })

  return jsonWithRequestId({ success: true, updatedCount: result.count }, requestId)
}
