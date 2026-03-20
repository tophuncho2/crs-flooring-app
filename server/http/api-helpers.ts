import { Prisma } from "@prisma/client"
import { getPrismaConnectivityIssue } from "@/server/db/prisma-errors"

export type AppError = {
  message: string
  status?: number
  field?: string
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
    throw { message: `${field} is required`, field } as AppError
  }
  return value.trim()
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
    throw { message: `${field} must be a 2-letter state abbreviation`, field } as AppError
  }

  if (parsed.replace(/[^a-zA-Z]/g, "").length > 2) {
    throw { message: `${field} must be a 2-letter state abbreviation`, field } as AppError
  }

  return normalized
}

export function parseBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw { message: `${field} must be true or false`, field } as AppError
  }
  return value
}

export function parseDecimal(value: unknown, field: string, scale: number): Prisma.Decimal {
  if (value === null || value === undefined || value === "") {
    throw { message: `${field} is required`, field } as AppError
  }

  const asString = String(value).trim()

  if (!/^-?\d+(\.\d+)?$/.test(asString)) {
    throw { message: `${field} must be a valid number`, field } as AppError
  }

  const [, fractional = ""] = asString.split(".")
  if (fractional.length > scale) {
    throw { message: `${field} can have at most ${scale} decimal places`, field } as AppError
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

export function normalizePrismaError(error: unknown): { status: number; message: string } {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string" &&
    "field" in error
  ) {
    const appError = error as AppError

    return {
      status: typeof appError.status === "number" ? appError.status : 400,
      message: appError.message,
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
        return { status: 409, message: `${formatFieldLabel(target[0])} must be unique` }
      }

      return { status: 409, message: "Unique constraint violation" }
    }
    if (error.code === "P2003") {
      return { status: 409, message: "This record is linked and cannot be modified" }
    }
    if (error.code === "P2011") {
      return { status: 400, message: "A required database field was missing" }
    }
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return { status: 500, message: "Database client crashed while processing the request" }
  }

  return { status: 500, message: "Unexpected server error" }
}
