import { InventoryExecutionError } from "@builders/application"
import type { UpdateInventoryInput } from "@builders/application"

function optionalString(value: unknown, field: string): string {
  if (value === undefined || value === null) return ""
  if (typeof value !== "string") {
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: `${field} must be a string`,
      status: 400,
      field,
    })
  }
  return value
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: `${field} must be true or false`,
      status: 400,
      field,
    })
  }
  return value
}

export function validateUpdateInventoryInput(body: Record<string, unknown>): UpdateInventoryInput {
  // Cost and freight are intentionally NOT accepted here. They are editable only
  // from the imports record view's staged-inventory-rows section while
  // `isImported = false`. Once a row is imported, cost/freight are locked to
  // preserve the accounting snapshot that cut logs reference.
  const input: UpdateInventoryInput = {}
  if (body.itemNumber !== undefined) input.itemNumber = optionalString(body.itemNumber, "itemNumber")
  if (body.dyeLot !== undefined) input.dyeLot = optionalString(body.dyeLot, "dyeLot")
  if (body.warehouseId !== undefined) input.warehouseId = optionalString(body.warehouseId, "warehouseId")
  if (body.locationId !== undefined) input.locationId = optionalString(body.locationId, "locationId")
  if (body.notes !== undefined) input.notes = optionalString(body.notes, "notes")
  if (body.isArchived !== undefined) input.isArchived = requireBoolean(body.isArchived, "isArchived")
  return input
}
