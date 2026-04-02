import { logStructuredEvent } from "@builders/lib"

type LogLevel = "info" | "warn" | "error"

type StructuredLogEvent = {
  level?: LogLevel
  message: string
  action?: string
  route?: string
  requestId?: string
  userId?: string
  userEmail?: string
  clientIp?: string
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
  error?: unknown
}

export function logEvent(event: StructuredLogEvent) {
  const { route, userId, userEmail, clientIp, entityType, entityId, details, ...rest } = event

  const extraDetails: Record<string, unknown> = {
    ...details,
    ...(route != null && { route }),
    ...(userId != null && { userId }),
    ...(userEmail != null && { userEmail }),
    ...(clientIp != null && { clientIp }),
    ...(entityType != null && { entityType }),
    ...(entityId != null && { entityId }),
  }

  logStructuredEvent({
    ...rest,
    service: "web",
    environment: process.env.NODE_ENV ?? "development",
    details: Object.keys(extraDetails).length > 0 ? extraDetails : undefined,
  })
}
