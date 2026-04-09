import { setUserPasswordUseCase } from "@builders/application"
import { parseRequiredString, normalizePrismaError } from "@/server/http/api-helpers"
import { logEvent } from "@/server/platform/logger"
import { buildRateLimitResponse, consumeRateLimit } from "@/server/platform/rate-limit"
import { getClientIp, getRequestId, jsonWithRequestId } from "@/server/platform/request-context"

const MIN_PASSWORD_LENGTH = 8

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  const clientIp = getClientIp(request)

  try {
    const rateLimit = await consumeRateLimit({
      request,
      scope: "auth.set-password",
      identifier: clientIp,
      limit: 5,
      windowMs: 5 * 60 * 1000,
      route: "/api/auth/set-password",
    })

    if (!rateLimit.allowed) {
      return buildRateLimitResponse(rateLimit)
    }

    const body = (await request.json()) as Record<string, unknown>
    const email = parseRequiredString(body.email, "email")
    const password = parseRequiredString(body.password, "password")

    if (password.length < MIN_PASSWORD_LENGTH) {
      return jsonWithRequestId(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        requestId,
        { status: 400 },
      )
    }

    await setUserPasswordUseCase({ email, password })

    logEvent({
      message: "Password set for new user",
      action: "auth.set-password",
      route: "/api/auth/set-password",
      requestId,
      clientIp,
    })

    return jsonWithRequestId({ ok: true }, requestId, { status: 200 })
  } catch (error) {
    logEvent({
      level: "error",
      message: "Set password failed",
      action: "auth.set-password.error",
      route: "/api/auth/set-password",
      requestId,
      clientIp,
      error,
    })

    const normalized = normalizePrismaError(error)
    return jsonWithRequestId({ error: normalized.message }, requestId, { status: normalized.status })
  }
}
