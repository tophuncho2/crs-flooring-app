import bcrypt from "bcrypt"
import { prisma } from "@/server/db/prisma"
import { hasGovernanceAccess } from "@/server/auth/access-control"
import { getSessionUser } from "@/server/auth/session"
import { logEvent } from "@/server/platform/logger"
import { buildRateLimitResponse, consumeRateLimit } from "@/server/platform/rate-limit"
import { getClientIp, getRequestId, jsonWithRequestId } from "@/server/platform/request-context"

type RegisterBody = {
  email?: string
  password?: string
  role?: string
  isVerified?: boolean
}

const MIN_PASSWORD_LENGTH = 12

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export async function POST(request: Request) {
  // Intentional route-policy exception:
  // this endpoint supports the public bootstrap/request flow and cannot require an
  // already-authenticated session before enforcing its own policy checks.
  const requestId = getRequestId(request)
  const clientIp = getClientIp(request)

  try {
    const body = (await request.json()) as RegisterBody
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : ""
    const password = typeof body.password === "string" ? body.password : ""
    const actor = await getSessionUser()
    const viewerCanGovern = Boolean(actor && hasGovernanceAccess(actor.role))

    const rateLimit = await consumeRateLimit({
      request,
      scope: viewerCanGovern ? "users.create" : "auth.register",
      identifier: email,
      limit: viewerCanGovern ? 20 : 5,
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

    if (password.length < MIN_PASSWORD_LENGTH) {
      return jsonWithRequestId({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, requestId, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return jsonWithRequestId({ error: "Account already exists" }, requestId, { status: 409 })
    }

    if (viewerCanGovern && body.role && body.role !== "BUILDER") {
      return jsonWithRequestId({ error: "Only builder accounts can be created from this route" }, requestId, { status: 400 })
    }

    const userCount = await prisma.user.count()
    if (userCount === 0 && !viewerCanGovern) {
      return jsonWithRequestId(
        { error: "Initial owner must be created from the CLI recovery path before web registration is enabled" },
        requestId,
        { status: 403 },
      )
    }

    const hashed = await bcrypt.hash(password, 10)
    const role = "BUILDER" as const
    const isVerified = viewerCanGovern
      ? typeof body.isVerified === "boolean"
        ? body.isVerified
        : true
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
      action: viewerCanGovern ? "users.create" : "auth.register",
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

    const message = viewerCanGovern
      ? createdUser.isVerified
        ? "Builder account created."
        : "Builder account created and left pending approval."
      : "Account request created. Pending approval."

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
