import {
  Prisma,
  getInventoryById,
  getLocationById,
  getWarehouseById,
  updateInventoryRecord,
  withDatabaseTransaction,
  type UpdateInventoryRecordInput as DbUpdateInventoryInput,
} from "@builders/db"
import {
  describeInventoryFormValidationIssues,
  validateInventoryForm,
} from "@builders/domain"
import { InventoryExecutionError } from "./errors.js"
import type { InventoryResult, UpdateInventoryInput } from "./types.js"

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export async function updateInventoryUseCase(
  id: string,
  input: UpdateInventoryInput,
  client?: Prisma.TransactionClient,
): Promise<InventoryResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const current = await getInventoryById(id, c)
    if (!current) {
      throw new InventoryExecutionError({
        code: "INVENTORY_NOT_FOUND",
        message: "Inventory row not found.",
        status: 404,
      })
    }

    const mergedWarehouseId = (input.warehouseId ?? current.warehouseId).trim()
    const rawMergedLocationId = input.locationId ?? current.locationId
    const mergedLocationId = rawMergedLocationId.trim() || null

    const warehouseChanged =
      input.warehouseId !== undefined && input.warehouseId !== current.warehouseId
    if (warehouseChanged && mergedWarehouseId) {
      const warehouse = await getWarehouseById(mergedWarehouseId, c)
      if (!warehouse) {
        throw new InventoryExecutionError({
          code: "INVENTORY_WAREHOUSE_NOT_FOUND",
          message: "Selected warehouse does not exist.",
          status: 404,
          field: "warehouseId",
        })
      }
    }

    let resolvedLocation: { id: string; warehouseId: string } | null = null
    const locationChanged =
      input.locationId !== undefined && (input.locationId ?? "") !== current.locationId
    if (mergedLocationId && (locationChanged || warehouseChanged)) {
      const location = await getLocationById(mergedLocationId, c)
      if (!location) {
        throw new InventoryExecutionError({
          code: "INVENTORY_LOCATION_NOT_FOUND",
          message: "Selected location does not exist.",
          status: 404,
          field: "locationId",
        })
      }
      resolvedLocation = { id: location.id, warehouseId: location.warehouseId }
    }

    const issues = validateInventoryForm(
      { warehouseId: mergedWarehouseId, locationId: mergedLocationId },
      resolvedLocation,
    )
    if (issues.length > 0) {
      throw new InventoryExecutionError({
        code: "INVENTORY_VALIDATION_FAILED",
        message: describeInventoryFormValidationIssues(issues),
        status: 400,
        payload: { issues },
      })
    }

    const dbInput: DbUpdateInventoryInput = {}
    if (input.itemNumber !== undefined) dbInput.itemNumber = emptyToNull(input.itemNumber)
    if (input.dyeLot !== undefined) dbInput.dyeLot = emptyToNull(input.dyeLot)
    if (input.notes !== undefined) dbInput.notes = emptyToNull(input.notes)
    if (input.isArchived !== undefined) dbInput.isArchived = input.isArchived
    if (input.warehouseId !== undefined) {
      dbInput.warehouseId = mergedWarehouseId
    }
    if (input.locationId !== undefined) {
      dbInput.locationId = mergedLocationId
      // Source-of-truth rule: if location changed and caller didn't also send a
      // warehouseId, re-stamp warehouseId from the resolved location.
      if (locationChanged && resolvedLocation && !warehouseChanged) {
        dbInput.warehouseId = resolvedLocation.warehouseId
      }
    }

    return updateInventoryRecord(id, dbInput, c)
  })
}
