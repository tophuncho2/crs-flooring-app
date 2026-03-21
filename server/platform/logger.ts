import { getRuntimeEnvironmentLabel, getRuntimeServiceName } from "@/server/platform/env"

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

function serializeError(error: unknown) {
  if (!error) {
    return undefined
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return error
}

export function logEvent(event: StructuredLogEvent) {
  const level = event.level ?? "info"
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    environment: getRuntimeEnvironmentLabel(),
    service: getRuntimeServiceName(),
    message: event.message,
    action: event.action,
    route: event.route,
    requestId: event.requestId,
    userId: event.userId,
    userEmail: event.userEmail,
    clientIp: event.clientIp,
    entityType: event.entityType,
    entityId: event.entityId,
    details: event.details,
    error: serializeError(event.error),
  }

  const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.info
  logger(JSON.stringify(payload))
}
