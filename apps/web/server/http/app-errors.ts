export type AppError = {
  kind?: "app"
  message: string
  status?: number
  field?: string
  payload?: Record<string, unknown>
}

export function createAppError(
  message: string,
  options: { status?: number; field?: string; payload?: Record<string, unknown> } = {},
): AppError {
  return {
    kind: "app",
    message,
    status: options.status,
    field: options.field,
    payload: options.payload,
  }
}

export function isAppError(error: unknown): error is AppError {
  return Boolean(
    error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string" &&
      ((error as { kind?: unknown }).kind === "app" || "field" in error || "status" in error),
  )
}
