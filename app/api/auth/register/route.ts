import bcrypt from "bcrypt"
import { prisma } from "@/server/db/prisma"
import { isAdmin } from "@/server/auth/access-control"
import { getSessionUser } from "@/server/auth/session"
import { logEvent } from "@/server/platform/logger"
import { buildRateLimitResponse, consumeRateLimit } from "@/server/platform/rate-limit"
import { getClientIp, getRequestId, jsonWithRequestId } from "@/server/platform/request-context"

type RegisterBody = {
  email?: string
  password?: string
  role?: "ADMIN" | "BUILDER"
  isVerified?: boolean
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  const clientIp = getClientIp(request)

  try {
    const body = (await request.json()) as RegisterBody
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : ""
    const password = typeof body.password === "string" ? body.password : ""
    const actor = await getSessionUser()
    const viewerIsAdmin = Boolean(actor && isAdmin(actor.role))

    const rateLimit = await consumeRateLimit({
      request,
      scope: viewerIsAdmin ? "users.create" : "auth.register",
      identifier: email,
      limit: viewerIsAdmin ? 20 : 5,
      windowMs: 15 * 60 * 1000,
      route: "/api/auth/register",
      userId: actor?.id,
      userEmail: actor?.email ?? email,
    })

    if (!rateLimit.allowed) {
      return buildRateLimitResponse(rateLimit)
    }

    if (!email || !password) {
      return jsonWithRequestId({ error: "Email and password are required" }, requestId, { status: 400 })
    }

    if (password.length < 8) {
      return jsonWithRequestId({ error: "Password must be at least 8 characters" }, requestId, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return jsonWithRequestId({ error: "Account already exists" }, requestId, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 10)
    const adminCount = await prisma.user.count({
      where: {
        role: "ADMIN",
      },
    })
    const isBootstrap = adminCount === 0

    const role: "ADMIN" | "BUILDER" = viewerIsAdmin
      ? body.role === "ADMIN"
        ? "ADMIN"
        : "BUILDER"
      : isBootstrap
        ? "ADMIN"
        : "BUILDER"
    const isVerified = viewerIsAdmin
      ? role === "ADMIN"
        ? true
        : typeof body.isVerified === "boolean"
          ? body.isVerified
          : true
      : isBootstrap
        ? true
        : false

    const createdUser = await prisma.user.create({
      data: {
        email,
        password: hashed,
        role,
        isVerified,
      },
      select: { id: true, role: true, isVerified: true },
    })

    logEvent({
      message: "Account created",
      action: viewerIsAdmin ? "users.create" : isBootstrap ? "auth.bootstrap" : "auth.register",
      route: "/api/auth/register",
      requestId,
      userId: actor?.id,
      userEmail: actor?.email ?? email,
      clientIp,
      entityType: "user",
      entityId: createdUser.id,
      details: {
        createdEmail: email,
        createdRole: createdUser.role,
        createdIsVerified: createdUser.isVerified,
      },
    })

    const message = viewerIsAdmin
      ? createdUser.role === "ADMIN"
        ? "Admin account created."
        : createdUser.isVerified
          ? "Builder account created."
          : "Builder account created and left pending approval."
      : isBootstrap
        ? "Initial admin account created."
        : "Account request created. Pending admin approval."

    return jsonWithRequestId(
      {
        success: true,
        message,
      },
      requestId,
      { status: 201 },
    )
  } catch (error) {
    logEvent({
      level: "error",
      message: "Account registration failed",
      action: "auth.register.error",
      route: "/api/auth/register",
      requestId,
      clientIp,
      error,
    })
    return jsonWithRequestId({ error: "Unexpected server error" }, requestId, { status: 500 })
  }
}
