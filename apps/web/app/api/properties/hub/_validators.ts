import { PropertyExecutionError } from "@builders/application"
import type { CreatePropertyHubUseCaseInput } from "@builders/application"
import { validateCreateEntityInput } from "../../entities/_validators"
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

function readEntitySelection(
  raw: unknown,
): CreatePropertyHubUseCaseInput["entity"] {
  if (!isRecord(raw)) fail("entity is required", "entity")
  const mode = raw.mode
  if (mode === "none") return { mode: "none" }
  if (mode === "link") {
    if (typeof raw.id !== "string" || !raw.id.trim()) {
      fail("entity.id is required", "entity.id")
    }
    return { mode: "link", id: raw.id.trim() }
  }
  if (mode === "create") {
    if (!isRecord(raw.fields)) {
      fail("entity.fields is required", "entity.fields")
    }
    return { mode: "create", fields: validateCreateEntityInput(raw.fields) }
  }
  fail("entity.mode must be one of none|link|create", "entity.mode")
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
    entity: readEntitySelection(body.entity),
    property: readPropertySelection(body.property),
  }
}
