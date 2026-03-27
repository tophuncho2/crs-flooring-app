type LogLevel = "info" | "warn" | "error"

type StructuredLogEvent = {
  level?: LogLevel
  service: string
  environment: string
  message: string
  action?: string
  requestId?: string
  workOrderId?: string
  generationId?: string
  idempotencyKey?: string
  queueJobId?: string
  attempt?: number
  fileKey?: string
  status?: string
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

export function logStructuredEvent(event: StructuredLogEvent) {
  const level = event.level ?? "info"
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    service: event.service,
    environment: event.environment,
    message: event.message,
    action: event.action,
    requestId: event.requestId,
    workOrderId: event.workOrderId,
    generationId: event.generationId,
    idempotencyKey: event.idempotencyKey,
    queueJobId: event.queueJobId,
    attempt: event.attempt,
    fileKey: event.fileKey,
    status: event.status,
    details: event.details,
    error: serializeError(event.error),
  }

  const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.info
  logger(JSON.stringify(payload))
}
