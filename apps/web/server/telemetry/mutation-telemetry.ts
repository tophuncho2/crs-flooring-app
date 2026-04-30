import { logEvent } from "@/server/platform/logger"
import type { AuthorizedRouteContext } from "@/server/auth/route-auth"

export async function withMutationTelemetry<T>(
  context: AuthorizedRouteContext,
  options: {
    route: string
    action: string
    message: string
    failureAction?: string
    failureMessage?: string
    entityType?: string
    entityId?: string
    details?: Record<string, unknown>
  },
  operation: () => Promise<T>,
) {
  try {
    const result = await operation()
    logEvent({
      message: options.message,
      action: options.action,
      route: options.route,
      requestId: context.requestId,
      userId: context.user.id,
      userEmail: context.user.email,
      clientIp: context.clientIp,
      entityType: options.entityType,
      entityId: options.entityId,
      details: options.details,
    })
    return result
  } catch (error) {
    logEvent({
      level: "error",
      message: options.failureMessage ?? `${options.message} failed`,
      action: options.failureAction ?? `${options.action}.error`,
      route: options.route,
      requestId: context.requestId,
      userId: context.user.id,
      userEmail: context.user.email,
      clientIp: context.clientIp,
      entityType: options.entityType,
      entityId: options.entityId,
      details: options.details,
      error,
    })
    throw error
  }
}
