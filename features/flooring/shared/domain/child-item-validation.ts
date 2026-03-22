import { Prisma } from "@prisma/client"
import { createAppError } from "@/server/http/api-helpers"

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
