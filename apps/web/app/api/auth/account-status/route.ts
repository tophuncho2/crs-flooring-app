import { getAuthAccountStatusUseCase } from "@builders/application"
import { parseRequiredString, normalizePrismaError } from "@/server/http/api-helpers"
import { logEvent } from "@/server/platform/logger"
import { buildRateLimitResponse, consumeRateLimit } from "@/server/platform/rate-limit"
import { getClientIp, getRequestId, jsonWithRequestId } from "@/server/platform/request-context"

export async function POST(request: Request) {
  const requestId = getRequestId(request)
  const clientIp = getClientIp(request)

  try {
    const rateLimit = await consumeRateLimit({
      request,
      scope: "auth.account-status",
      identifier: clientIp,
      limit: 20,
      windowMs: 5 * 60 * 1000,
      route: "/api/auth/account-status",
    })

    if (!rateLimit.allowed) {
      return buildRateLimitResponse(rateLimit)
    }

    const body = (await request.json()) as Record<string, unknown>
    const email = parseRequiredString(body.email, "email")

    const { status } = await getAuthAccountStatusUseCase({ email })

    // Intentionally no success log: this fires on every login attempt and the
    // subsequent sign-in already emits "Login succeeded" / a structured warn.
    return jsonWithRequestId({ status }, requestId, { status: 200 })
  } catch (error) {
    logEvent({
      level: "error",
      message: "Account status lookup failed",
      action: "auth.account-status.error",
      route: "/api/auth/account-status",
      requestId,
      clientIp,
      error,
    })

    const normalized = normalizePrismaError(error)
    return jsonWithRequestId({ error: normalized.message }, requestId, { status: normalized.status })
  }
}
