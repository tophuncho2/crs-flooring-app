import { ContactExecutionError } from "@builders/application"
import type { ContactInput } from "@builders/application"
import { validateContactType } from "@builders/domain"

export function validateContactInput(body: Record<string, unknown>): ContactInput {
  const name = typeof body.name === "string" ? body.name.trim() : ""

  if (!name) {
    throw new ContactExecutionError({
      code: "CONTACT_VALIDATION_FAILED",
      message: "name is required",
      status: 400,
      field: "name",
    })
  }

  const type = typeof body.type === "string" ? body.type.trim() : ""

  if (!validateContactType(type)) {
    throw new ContactExecutionError({
      code: "CONTACT_VALIDATION_FAILED",
      message: "type must be Sales Rep, Contractor, or Other",
      status: 400,
      field: "type",
    })
  }

  return { name, type }
}
