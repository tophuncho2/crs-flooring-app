import { prisma } from "@/server/db/prisma"
import { getSessionUser } from "@/server/auth/session"
import { ensureBuilderPanelAccess } from "@/server/auth/route-auth"
import {
  assertGovernedUserDelete,
  assertGovernedUserUpdate,
  countAdminUsers,
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
    role?: "ADMIN" | "BUILDER"
    isVerified?: boolean
  }

  const { id } = await params

  const existingUser = await prisma.user.findUnique({ where: { id } })
  if (!existingUser) {
    return jsonWithRequestId({ error: "User not found" }, requestId, { status: 404 })
  }
  if (existingUser.role !== "ADMIN" && existingUser.role !== "BUILDER") {
    return jsonWithRequestId({ error: "Only system users can be governed from this panel" }, requestId, { status: 409 })
  }

  if ("role" in body && body.role && body.role !== "ADMIN" && body.role !== "BUILDER") {
    return jsonWithRequestId({ error: "Role must be ADMIN or BUILDER" }, requestId, { status: 400 })
  }

  const adminCount = await countAdminUsers()
  const nextRole: "ADMIN" | "BUILDER" = body.role ?? existingUser.role
  const nextIsVerifiedInput = resolveGovernedVerification(
    nextRole,
    typeof body.isVerified === "boolean" ? body.isVerified : undefined,
    existingUser.isVerified,
  )

  try {
    assertGovernedUserUpdate({
      actor,
      target: existingUser,
      nextRole,
      adminCount,
    })
  } catch (error) {
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : "Forbidden"
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 403
    return jsonWithRequestId({ error: message }, requestId, { status })
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      role: nextRole,
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
      nextRole,
      nextIsVerified: nextIsVerifiedInput,
    },
  })
  const nextAdminCount = nextRole === existingUser.role ? adminCount : await countAdminUsers()

  return jsonWithRequestId(
    {
      user: normalizeManagedUserRow(updated, actor, nextAdminCount),
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
  if (existingUser.role !== "ADMIN" && existingUser.role !== "BUILDER") {
    return jsonWithRequestId({ error: "Only system users can be governed from this panel" }, requestId, { status: 409 })
  }

  const adminCount = await countAdminUsers()
  try {
    assertGovernedUserDelete({
      actor,
      target: existingUser,
      adminCount,
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
