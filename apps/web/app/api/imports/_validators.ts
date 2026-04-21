import { ImportExecutionError } from "@builders/application"
import type { CreateImportInput, UpdateImportInput } from "@builders/application"

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new ImportExecutionError({
      code: "IMPORT_VALIDATION_FAILED",
      message: `${field} must be a string`,
      status: 400,
      field,
    })
  }
  return value
}

function optionalString(value: unknown, field: string): string {
  if (value === undefined || value === null) return ""
  if (typeof value !== "string") {
    throw new ImportExecutionError({
      code: "IMPORT_VALIDATION_FAILED",
      message: `${field} must be a string`,
      status: 400,
      field,
    })
  }
  return value
}

export function validateCreateImportInput(body: Record<string, unknown>): CreateImportInput {
  return {
    orderNumber: optionalString(body.orderNumber, "orderNumber"),
    tag: optionalString(body.tag, "tag"),
    transportType: requireString(body.transportType, "transportType"),
    status: requireString(body.status, "status"),
    notes: optionalString(body.notes, "notes"),
    warehouseId: optionalString(body.warehouseId, "warehouseId"),
  }
}

export function validateUpdateImportInput(body: Record<string, unknown>): UpdateImportInput {
  const input: UpdateImportInput = {}
  if (body.orderNumber !== undefined) input.orderNumber = optionalString(body.orderNumber, "orderNumber")
  if (body.tag !== undefined) input.tag = optionalString(body.tag, "tag")
  if (body.transportType !== undefined) input.transportType = requireString(body.transportType, "transportType")
  if (body.status !== undefined) input.status = requireString(body.status, "status")
  if (body.notes !== undefined) input.notes = optionalString(body.notes, "notes")
  if (body.warehouseId !== undefined) input.warehouseId = optionalString(body.warehouseId, "warehouseId")
  return input
}
