import { Prisma, getPrismaConnectivityIssue } from "@builders/db"

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

export function parseUuidParam(value: unknown, field: string): string {
  const parsed = parseRequiredString(value, field)
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  if (!uuidPattern.test(parsed)) {
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

export function parseOptionalStateAbbreviation(value: unknown, field: string): string | null {
  const parsed = parseOptionalString(value)
  if (parsed === null) {
    return null
  }

  const normalized = parsed.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase()
  if (normalized.length === 0) {
    return null
  }

  if (normalized.length > 2) {
    throw createAppError(`${field} must be a 2-letter state abbreviation`, { field })
  }

  if (parsed.replace(/[^a-zA-Z]/g, "").length > 2) {
    throw createAppError(`${field} must be a 2-letter state abbreviation`, { field })
  }

  return normalized
}

export function parseBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw createAppError(`${field} must be true or false`, { field })
  }
  return value
}

export function parseDecimal(value: unknown, field: string, scale: number): Prisma.Decimal {
  if (value === null || value === undefined || value === "") {
    throw createAppError(`${field} is required`, { field })
  }

  const asString = String(value).trim()

  if (!/^-?\d+(\.\d+)?$/.test(asString)) {
    throw createAppError(`${field} must be a valid number`, { field })
  }

  const [, fractional = ""] = asString.split(".")
  if (fractional.length > scale) {
    throw createAppError(`${field} can have at most ${scale} decimal places`, { field })
  }

  return new Prisma.Decimal(asString)
}

export function parseDecimalOrDefault(
  value: unknown,
  field: string,
  scale: number,
  defaultValue: string,
): Prisma.Decimal {
  if (value === null || value === undefined || value === "") {
    return new Prisma.Decimal(defaultValue)
  }

  return parseDecimal(value, field, scale)
}

export function normalizePrismaError(error: unknown): {
  status: number
  message: string
  field?: string
  payload?: Record<string, unknown>
} {
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
