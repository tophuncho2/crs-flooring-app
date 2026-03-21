import { prisma } from "@/server/db/prisma"
import { getSessionUser } from "@/server/auth/session"
import { ensureBuilderPanelAccess } from "@/server/auth/route-auth"
import {
  assertGovernedUserDelete,
  assertGovernedUserUpdate,
  normalizeManagedUserRow,
  resolveGovernedVerification,
} from "@/server/auth/user-governance"
import { logEvent } from "@/server/platform/logger"
import { buildRateLimitResponse, consumeRateLimit } from "@/server/platform/rate-limit"
import { getClientIp, getRequestId, jsonWithRequestId } from "@/server/platform/request-context"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
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
    scope: "users.update",
    identifier: actor.id,
    limit: 30,
    windowMs: 10 * 60 * 1000,
    route: "/api/builder/users/[id]",
    userId: actor.id,
    userEmail: actor.email,
  })

  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit)
  }

  const body = (await request.json()) as {
    role?: unknown
    isVerified?: boolean
  }

  const { id } = await params

  const existingUser = await prisma.user.findUnique({ where: { id } })
  if (!existingUser) {
    return jsonWithRequestId({ error: "User not found" }, requestId, { status: 404 })
  }
  if (existingUser.role !== "BUILDER") {
    return jsonWithRequestId({ error: "Only builder accounts can be governed from this panel" }, requestId, { status: 409 })
  }

  if ("role" in body) {
    return jsonWithRequestId({ error: "Builder roles cannot be edited from this panel" }, requestId, { status: 400 })
  }

  const nextIsVerifiedInput = resolveGovernedVerification(
    existingUser.role,
    typeof body.isVerified === "boolean" ? body.isVerified : undefined,
    existingUser.isVerified,
  )

  try {
    assertGovernedUserUpdate({
      actor,
      target: existingUser,
    })
  } catch (error) {
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : "Forbidden"
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 403
    return jsonWithRequestId({ error: message }, requestId, { status })
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      isVerified: nextIsVerifiedInput,
    },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
      createdAt: true,
    },
  })

  logEvent({
    message: "User governance updated",
    action: "users.update",
    route: "/api/builder/users/[id]",
    requestId,
    userId: actor.id,
    userEmail: actor.email,
    clientIp,
    entityType: "user",
    entityId: updated.id,
    details: {
      nextIsVerified: nextIsVerifiedInput,
    },
  })

  return jsonWithRequestId(
    {
      user: normalizeManagedUserRow(updated, actor),
    },
    requestId,
  )
}

export async function DELETE(request: Request, { params }: RouteContext) {
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
    scope: "users.delete",
    identifier: actor.id,
    limit: 20,
    windowMs: 10 * 60 * 1000,
    route: "/api/builder/users/[id]",
    userId: actor.id,
    userEmail: actor.email,
  })

  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit)
  }

  const { id } = await params

  const existingUser = await prisma.user.findUnique({ where: { id } })

  if (!existingUser) {
    return jsonWithRequestId({ error: "User not found" }, requestId, { status: 404 })
  }
  if (existingUser.role !== "BUILDER") {
    return jsonWithRequestId({ error: "Only builder accounts can be governed from this panel" }, requestId, { status: 409 })
  }

  try {
    assertGovernedUserDelete({
      actor,
      target: existingUser,
    })
  } catch (error) {
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : "Forbidden"
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 403
    return jsonWithRequestId({ error: message }, requestId, { status })
  }

  await prisma.user.delete({ where: { id } })

  logEvent({
    message: "User deleted",
    action: "users.delete",
    route: "/api/builder/users/[id]",
    requestId,
    userId: actor.id,
    userEmail: actor.email,
    clientIp,
    entityType: "user",
    entityId: existingUser.id,
    details: {
      deletedEmail: existingUser.email,
      deletedRole: existingUser.role,
    },
  })

  return jsonWithRequestId({ success: true }, requestId)
}
