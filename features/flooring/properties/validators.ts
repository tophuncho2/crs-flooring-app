import { parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"

export type CreatePropertyInput = {
  managementCompanyId: string
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
}

export type UpdatePropertyInput = Partial<CreatePropertyInput>

export function validateCreatePropertyInput(body: Record<string, unknown>): CreatePropertyInput {
  return {
    managementCompanyId: parseRequiredString(body.managementCompanyId, "managementCompanyId"),
    name: parseRequiredString(body.name, "name"),
    streetAddress: parseOptionalString(body.streetAddress),
    city: parseOptionalString(body.city),
    state: parseOptionalString(body.state),
    postalCode: parseOptionalString(body.zip ?? body.postalCode),
    phone: parseOptionalString(body.phone),
    email: parseOptionalString(body.email),
  }
}

export function validateUpdatePropertyInput(body: Record<string, unknown>): UpdatePropertyInput {
  const input: UpdatePropertyInput = {}

  if ("managementCompanyId" in body) input.managementCompanyId = parseRequiredString(body.managementCompanyId, "managementCompanyId")
  if ("name" in body) input.name = parseRequiredString(body.name, "name")
  if ("streetAddress" in body) input.streetAddress = parseOptionalString(body.streetAddress)
  if ("city" in body) input.city = parseOptionalString(body.city)
  if ("state" in body) input.state = parseOptionalString(body.state)
  if ("zip" in body || "postalCode" in body) input.postalCode = parseOptionalString(body.zip ?? body.postalCode)
  if ("phone" in body) input.phone = parseOptionalString(body.phone)
  if ("email" in body) input.email = parseOptionalString(body.email)

  return input
}
