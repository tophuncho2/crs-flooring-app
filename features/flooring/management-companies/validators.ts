import { parseOptionalStateAbbreviation, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"

export type CreateManagementCompanyInput = {
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
}

export type UpdateManagementCompanyInput = Partial<CreateManagementCompanyInput>

export function validateCreateManagementCompanyInput(body: Record<string, unknown>): CreateManagementCompanyInput {
  return {
    name: parseRequiredString(body.name, "name"),
    streetAddress: parseOptionalString(body.streetAddress),
    city: parseOptionalString(body.city),
    state: parseOptionalStateAbbreviation(body.state, "state"),
    postalCode: parseOptionalString(body.zip ?? body.postalCode),
    phone: parseOptionalString(body.phone),
    email: parseOptionalString(body.email),
  }
}

export function validateUpdateManagementCompanyInput(body: Record<string, unknown>): UpdateManagementCompanyInput {
  const input: UpdateManagementCompanyInput = {}

  if ("name" in body) input.name = parseRequiredString(body.name, "name")
  if ("streetAddress" in body) input.streetAddress = parseOptionalString(body.streetAddress)
  if ("city" in body) input.city = parseOptionalString(body.city)
  if ("state" in body) input.state = parseOptionalStateAbbreviation(body.state, "state")
  if ("zip" in body || "postalCode" in body) input.postalCode = parseOptionalString(body.zip ?? body.postalCode)
  if ("phone" in body) input.phone = parseOptionalString(body.phone)
  if ("email" in body) input.email = parseOptionalString(body.email)

  return input
}
