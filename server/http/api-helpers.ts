import { Prisma } from "@prisma/client"

export type AppError = {
  message: string
  field?: string
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
    return { status: 400, message: (error as AppError).message }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return { status: 409, message: "Unique constraint violation" }
    }
    if (error.code === "P2003") {
      return { status: 409, message: "This record is linked and cannot be modified" }
    }
    if (error.code === "P2011") {
      return { status: 400, message: "A required database field was missing" }
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return { status: 503, message: "Database is unavailable right now. Please try again." }
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return { status: 500, message: "Database client crashed while processing the request" }
  }

  return { status: 500, message: "Unexpected server error" }
}
