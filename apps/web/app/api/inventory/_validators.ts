import { InventoryExecutionError } from "@builders/application"
import type { CreateInventoryInput, UpdateInventoryInput } from "@builders/application"

function requireString(value: unknown, field: string): string {
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

export function validateCreateInventoryInput(body: Record<string, unknown>): CreateInventoryInput {
  return {
    productId: requireString(body.productId, "productId"),
    warehouseId: requireString(body.warehouseId, "warehouseId"),
    locationId: optionalString(body.locationId, "locationId"),
    itemNumber: requireString(body.itemNumber, "itemNumber"),
    dyeLot: optionalString(body.dyeLot, "dyeLot"),
    stockCount: requireString(body.stockCount, "stockCount"),
    cost: optionalString(body.cost, "cost"),
    freight: optionalString(body.freight, "freight"),
    notes: optionalString(body.notes, "notes"),
  }
}

export function validateUpdateInventoryInput(body: Record<string, unknown>): UpdateInventoryInput {
  // Cost and freight are intentionally NOT accepted here. They are editable only
  // from the imports record view's inventory-rows section while `isImported = false`.
  // Once a row is imported, cost/freight are locked to preserve the accounting
  // snapshot that cut logs reference. Attempts to set them via this route are
  // silently dropped; rely on the imports-diff path for any pre-import edits.
  const input: UpdateInventoryInput = {}
  if (body.productId !== undefined) input.productId = requireString(body.productId, "productId")
  if (body.warehouseId !== undefined) input.warehouseId = optionalString(body.warehouseId, "warehouseId")
  if (body.locationId !== undefined) input.locationId = optionalString(body.locationId, "locationId")
  if (body.itemNumber !== undefined) input.itemNumber = requireString(body.itemNumber, "itemNumber")
  if (body.dyeLot !== undefined) input.dyeLot = optionalString(body.dyeLot, "dyeLot")
  if (body.stockCount !== undefined) input.stockCount = requireString(body.stockCount, "stockCount")
  if (body.notes !== undefined) input.notes = optionalString(body.notes, "notes")
  return input
}
