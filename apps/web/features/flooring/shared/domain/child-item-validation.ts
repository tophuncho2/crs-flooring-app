import { Prisma } from "@builders/db"
import { createAppError } from "@/server/http/api-helpers"

function getEditableDecimalPattern(scale: number) {
  return new RegExp(`^\\d*(?:\\.\\d{0,${scale}})?$`)
}

export function normalizeEditableDecimalInput(value: string, scale = 2) {
  const trimmed = value.replace(/[^\d.]/g, "")
  const [whole, ...fractionalParts] = trimmed.split(".")

  if (fractionalParts.length === 0) {
    return whole
  }

  const fractional = fractionalParts.join("").slice(0, scale)
  return `${whole}.${fractional}`
}

export function isEditableDecimalInput(value: string, scale = 2) {
  return getEditableDecimalPattern(scale).test(value)
}

export function requirePositiveDecimal(value: Prisma.Decimal, field: string) {
  if (value.lte(0)) {
    throw createAppError(`${field} must be greater than 0`, { field })
  }

  return value
}

export function requireNonNegativeDecimal(value: Prisma.Decimal, field: string) {
  if (value.lt(0)) {
    throw createAppError(`${field} must be 0 or greater`, { field })
  }

  return value
}

export function requireServiceNameWhenCustom(serviceId: string | null, name: string | null) {
  if (!serviceId && !name) {
    throw createAppError("name is required when no saved service is selected", { field: "name" })
  }
}
