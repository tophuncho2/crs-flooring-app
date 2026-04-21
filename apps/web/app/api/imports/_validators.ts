import { ImportExecutionError, InventoryExecutionError } from "@builders/application"
import type { CreateImportInput, UpdateImportInput } from "@builders/application"
import type {
  InventoryRowDraft,
  InventoryRowDelete,
  InventoryRowsDiff,
  InventoryRowUpdate,
  InventoryRowUpdatePatch,
} from "@builders/domain"

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

// --- Inventory rows diff body shaper ---

function requireInventoryString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new InventoryExecutionError({
      code: "INVENTORY_DIFF_VALIDATION_FAILED",
      message: `${field} must be a string`,
      status: 400,
      field,
    })
  }
  return value
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== "string") {
    throw new InventoryExecutionError({
      code: "INVENTORY_DIFF_VALIDATION_FAILED",
      message: `${field} must be a string or null`,
      status: 400,
      field,
    })
  }
  return value
}

function requireObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InventoryExecutionError({
      code: "INVENTORY_DIFF_VALIDATION_FAILED",
      message: `${field} must be an object`,
      status: 400,
      field,
    })
  }
  return value as Record<string, unknown>
}

function requireArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new InventoryExecutionError({
      code: "INVENTORY_DIFF_VALIDATION_FAILED",
      message: `${field} must be an array`,
      status: 400,
      field,
    })
  }
  return value
}

function optionalDiffBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== "boolean") {
    throw new InventoryExecutionError({
      code: "INVENTORY_DIFF_VALIDATION_FAILED",
      message: `${field} must be true or false`,
      status: 400,
      field,
    })
  }
  return value
}

function shapeDraft(raw: unknown, idx: number): InventoryRowDraft {
  const row = requireObject(raw, `added[${idx}]`)
  const draft: InventoryRowDraft = {
    tempId: requireInventoryString(row.tempId, `added[${idx}].tempId`),
    productId: requireInventoryString(row.productId, `added[${idx}].productId`),
    itemNumber: requireInventoryString(row.itemNumber, `added[${idx}].itemNumber`),
    dyeLot: nullableString(row.dyeLot, `added[${idx}].dyeLot`),
    warehouseId: nullableString(row.warehouseId, `added[${idx}].warehouseId`),
    locationId: nullableString(row.locationId, `added[${idx}].locationId`),
    stockCount: requireInventoryString(row.stockCount, `added[${idx}].stockCount`),
    cost: nullableString(row.cost, `added[${idx}].cost`),
    freight: nullableString(row.freight, `added[${idx}].freight`),
    notes: nullableString(row.notes, `added[${idx}].notes`),
  }
  const isImported = optionalDiffBoolean(row.isImported, `added[${idx}].isImported`)
  if (isImported !== undefined) draft.isImported = isImported
  return draft
}

function shapePatch(raw: unknown, idx: number): InventoryRowUpdatePatch {
  const patch = requireObject(raw, `modified[${idx}].patch`)
  const result: InventoryRowUpdatePatch = {}
  if (patch.productId !== undefined) result.productId = requireInventoryString(patch.productId, `modified[${idx}].patch.productId`)
  if (patch.itemNumber !== undefined) result.itemNumber = requireInventoryString(patch.itemNumber, `modified[${idx}].patch.itemNumber`)
  if (patch.dyeLot !== undefined) result.dyeLot = nullableString(patch.dyeLot, `modified[${idx}].patch.dyeLot`)
  if (patch.warehouseId !== undefined) result.warehouseId = nullableString(patch.warehouseId, `modified[${idx}].patch.warehouseId`)
  if (patch.locationId !== undefined) result.locationId = nullableString(patch.locationId, `modified[${idx}].patch.locationId`)
  if (patch.stockCount !== undefined) result.stockCount = requireInventoryString(patch.stockCount, `modified[${idx}].patch.stockCount`)
  if (patch.cost !== undefined) result.cost = nullableString(patch.cost, `modified[${idx}].patch.cost`)
  if (patch.freight !== undefined) result.freight = nullableString(patch.freight, `modified[${idx}].patch.freight`)
  if (patch.notes !== undefined) result.notes = nullableString(patch.notes, `modified[${idx}].patch.notes`)
  if (patch.isImported !== undefined) {
    const parsed = optionalDiffBoolean(patch.isImported, `modified[${idx}].patch.isImported`)
    if (parsed !== undefined) result.isImported = parsed
  }
  return result
}

function shapeUpdate(raw: unknown, idx: number): InventoryRowUpdate {
  const row = requireObject(raw, `modified[${idx}]`)
  return {
    id: requireInventoryString(row.id, `modified[${idx}].id`),
    expectedUpdatedAt: requireInventoryString(row.expectedUpdatedAt, `modified[${idx}].expectedUpdatedAt`),
    patch: shapePatch(row.patch, idx),
  }
}

function shapeDelete(raw: unknown, idx: number): InventoryRowDelete {
  const row = requireObject(raw, `deleted[${idx}]`)
  return {
    id: requireInventoryString(row.id, `deleted[${idx}].id`),
    expectedUpdatedAt: requireInventoryString(row.expectedUpdatedAt, `deleted[${idx}].expectedUpdatedAt`),
  }
}

/**
 * Shapes the raw JSON body into an InventoryRowsDiff (domain type).
 *
 * Body-shape validation only — no business rules. The domain's
 * `validateInventoryRowsDiff` (called by `saveImportInventoryRowsUseCase`) handles
 * duplicates, warehouse mismatch, unknown product/location, and delete-blocking.
 */
export function validateInventoryRowsDiffBody(body: Record<string, unknown>): InventoryRowsDiff {
  const diffBody = requireObject(body.diff, "diff")
  const added = requireArray(diffBody.added, "diff.added")
  const modified = requireArray(diffBody.modified, "diff.modified")
  const deleted = requireArray(diffBody.deleted, "diff.deleted")
  return {
    added: added.map((entry, idx) => shapeDraft(entry, idx)),
    modified: modified.map((entry, idx) => shapeUpdate(entry, idx)),
    deleted: deleted.map((entry, idx) => shapeDelete(entry, idx)),
  }
}
