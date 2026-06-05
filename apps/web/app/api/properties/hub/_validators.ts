import { PropertyExecutionError } from "@builders/application"
import type { CreatePropertyHubUseCaseInput } from "@builders/application"
import { validateCreateManagementCompanyInput } from "../../management-companies/_validators"
import { validateCreatePropertyInput } from "../_validators"

function fail(message: string, field?: string): never {
  throw new PropertyExecutionError({
    code: "PROPERTY_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readMcSelection(
  raw: unknown,
): CreatePropertyHubUseCaseInput["managementCompany"] {
  if (!isRecord(raw)) fail("managementCompany is required", "managementCompany")
  const mode = raw.mode
  if (mode === "none") return { mode: "none" }
  if (mode === "link") {
    if (typeof raw.id !== "string" || !raw.id.trim()) {
      fail("managementCompany.id is required", "managementCompany.id")
    }
    return { mode: "link", id: raw.id.trim() }
  }
  if (mode === "create") {
    if (!isRecord(raw.fields)) {
      fail("managementCompany.fields is required", "managementCompany.fields")
    }
    return { mode: "create", fields: validateCreateManagementCompanyInput(raw.fields) }
  }
  fail("managementCompany.mode must be one of none|link|create", "managementCompany.mode")
}

function readPropertySelection(
  raw: unknown,
): CreatePropertyHubUseCaseInput["property"] {
  if (!isRecord(raw)) fail("property is required", "property")
  const mode = raw.mode
  if (mode === "none") return { mode: "none" }
  if (mode === "link") {
    if (typeof raw.id !== "string" || !raw.id.trim()) {
      fail("property.id is required", "property.id")
    }
    return { mode: "link", id: raw.id.trim() }
  }
  if (mode === "create") {
    if (!isRecord(raw.fields)) fail("property.fields is required", "property.fields")
    const parsed = validateCreatePropertyInput(raw.fields)
    return {
      mode: "create",
      fields: {
        name: parsed.name,
        streetAddress: parsed.streetAddress,
        city: parsed.city,
        state: parsed.state,
        postalCode: parsed.postalCode,
        phone: parsed.phone,
        email: parsed.email,
        instructions: parsed.instructions ?? null,
      },
    }
  }
  fail("property.mode must be one of none|link|create", "property.mode")
}

export function validateCreatePropertyHubInput(
  body: Record<string, unknown>,
): CreatePropertyHubUseCaseInput {
  return {
    managementCompany: readMcSelection(body.managementCompany),
    property: readPropertySelection(body.property),
  }
}
