import { Prisma, getPrismaConnectivityIssue } from "@builders/db"
import { type AppError, createAppError, isAppError } from "./app-errors"

export { type AppError, createAppError, isAppError }

function formatFieldLabel(field: string) {
  return field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (value) => value.toUpperCase())
}

export function parseRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw createAppError(`${field} is required`, { field })
  }
  return value.trim()
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value)
}

export function parseUuidParam(value: unknown, field: string): string {
  const parsed = parseRequiredString(value, field)

  if (!isValidUuid(parsed)) {
    throw createAppError(`${field} must be a valid UUID`, { field, status: 400 })
  }

  return parsed
}

export function parseOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

export function normalizePrismaError(error: unknown): {
  status: number
  message: string
  field?: string
  payload?: Record<string, unknown>
} {
  if (
    error instanceof Error &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number" &&
    (error as { status: number }).status >= 400 &&
    (error as { status: number }).status <= 499
  ) {
    const execError = error as Error & { status: number; field?: string; payload?: Record<string, unknown> }
    return {
      status: execError.status,
      message: execError.message,
      field: typeof execError.field === "string" ? execError.field : undefined,
      payload: execError.payload,
    }
  }

  if (isAppError(error)) {
    const appError = error as AppError
    return {
      status: typeof appError.status === "number" ? appError.status : 400,
      message: appError.message,
      field: typeof appError.field === "string" ? appError.field : undefined,
      payload: appError.payload,
    }
  }

  if (error && typeof error === "object" && "code" in error && typeof (error as { code: unknown }).code === "string") {
    const prismaLikeError = error as {
      code: string
      meta?: { target?: string[] | string }
    }

    if (prismaLikeError.code === "P2002") {
      const target = Array.isArray(prismaLikeError.meta?.target)
        ? prismaLikeError.meta?.target
        : typeof prismaLikeError.meta?.target === "string"
          ? [prismaLikeError.meta.target]
          : []

      if (target.length === 1 && typeof target[0] === "string") {
        return { status: 409, message: `${formatFieldLabel(target[0])} must be unique`, field: target[0] }
      }

      return { status: 409, message: "Unique constraint violation" }
    }

    if (prismaLikeError.code === "P2003") {
      return { status: 409, message: "This record is linked and cannot be modified" }
    }

    if (prismaLikeError.code === "P2025") {
      return { status: 404, message: "Record not found" }
    }
  }

  const connectivityIssue = getPrismaConnectivityIssue(error)
  if (connectivityIssue) {
    return { status: 503, message: connectivityIssue.message }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target : []
      if (target.length === 1 && typeof target[0] === "string") {
        return { status: 409, message: `${formatFieldLabel(target[0])} must be unique`, field: target[0] }
      }

      return { status: 409, message: "Unique constraint violation" }
    }
    if (error.code === "P2003") {
      return { status: 409, message: "This record is linked and cannot be modified" }
    }
    if (error.code === "P2011") {
      return { status: 400, message: "A required database field was missing" }
    }
    if (error.code === "P2025") {
      return { status: 404, message: "Record not found" }
    }
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return { status: 500, message: "Database client crashed while processing the request" }
  }

  return { status: 500, message: "Unexpected server error" }
}
