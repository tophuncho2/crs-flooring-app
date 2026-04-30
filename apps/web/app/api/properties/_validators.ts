import { PropertyExecutionError } from "@builders/application"
import type {
  CreatePropertyUseCaseInput,
  UpdatePropertyUseCaseInput,
} from "@builders/application"

function fail(message: string, field?: string): never {
  throw new PropertyExecutionError({
    code: "PROPERTY_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") fail(`${field} is required`, field)
  const trimmed = (value as string).trim()
  if (!trimmed) fail(`${field} is required`, field)
  return trimmed
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function optionalState(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^[A-Za-z]{2}$/.test(trimmed)) fail(`${field} must be a 2-letter state code`, field)
  return trimmed.toUpperCase()
}

function pickPostalCode(body: Record<string, unknown>): unknown {
  if ("postalCode" in body) return body.postalCode
  if ("zip" in body) return body.zip
  return undefined
}

export function validateCreatePropertyInput(
  body: Record<string, unknown>,
): CreatePropertyUseCaseInput {
  return {
    managementCompanyId: optionalString(body.managementCompanyId),
    name: requireString(body.name, "name"),
    streetAddress: optionalString(body.streetAddress),
    city: optionalString(body.city),
    state: optionalState(body.state, "state"),
    postalCode: optionalString(pickPostalCode(body)),
    phone: optionalString(body.phone),
    email: optionalString(body.email),
    instructions: optionalString(body.instructions),
  }
}

export function validateUpdatePropertyInput(
  body: Record<string, unknown>,
): UpdatePropertyUseCaseInput {
  const input: UpdatePropertyUseCaseInput = {}

  if ("managementCompanyId" in body) input.managementCompanyId = optionalString(body.managementCompanyId)
  if ("name" in body) input.name = requireString(body.name, "name")
  if ("streetAddress" in body) input.streetAddress = optionalString(body.streetAddress)
  if ("city" in body) input.city = optionalString(body.city)
  if ("state" in body) input.state = optionalState(body.state, "state")
  if ("zip" in body || "postalCode" in body) input.postalCode = optionalString(pickPostalCode(body))
  if ("phone" in body) input.phone = optionalString(body.phone)
  if ("email" in body) input.email = optionalString(body.email)
  if ("instructions" in body) input.instructions = optionalString(body.instructions)

  return input
}
