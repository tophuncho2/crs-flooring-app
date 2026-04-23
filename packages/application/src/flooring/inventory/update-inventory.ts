import {
  Prisma,
  getInventoryById,
  getLocationById,
  getProductById,
  getWarehouseById,
  updateInventory,
  withDatabaseTransaction,
  type UpdateInventoryInput as DbUpdateInventoryInput,
} from "@builders/db"
import {
  describeInventoryValidationIssues,
  isImportedReversal,
  validateInventoryInput,
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

    if (!current.isImported) {
      throw new InventoryExecutionError({
        code: "INVENTORY_PENDING_IMPORT",
        message:
          "Inventory row is pending import. Edits are only allowed once the row is marked Final from the imports record view.",
        status: 400,
      })
    }

    if (isImportedReversal(current, input)) {
      throw new InventoryExecutionError({
        code: "IMPORTED_REVERSAL_NOT_ALLOWED",
        message: "Inventory row is already imported and cannot return to pending.",
        status: 400,
        field: "isImported",
      })
    }

    const merged = {
      productId: input.productId ?? current.productId,
      itemNumber: input.itemNumber ?? current.itemNumber,
      warehouseId: input.warehouseId ?? current.warehouseId,
      locationId: input.locationId ?? current.locationId,
      stockCount: input.stockCount ?? current.stockCount,
    }

    const mergedWarehouseId = merged.warehouseId.trim()
    const mergedLocationId = merged.locationId.trim() || null

    const issues = validateInventoryInput(
      {
        productId: merged.productId,
        itemNumber: merged.itemNumber,
        warehouseId: mergedWarehouseId || null,
        locationId: mergedLocationId,
        stockCount: merged.stockCount,
      },
      null,
    )
    if (issues.length > 0) {
      throw new InventoryExecutionError({
        code: "INVENTORY_VALIDATION_FAILED",
        message: describeInventoryValidationIssues(issues),
        status: 400,
        payload: { issues },
      })
    }

    if (input.productId !== undefined && input.productId !== current.productId) {
      const product = await getProductById(input.productId, c)
      if (!product) {
        throw new InventoryExecutionError({
          code: "INVENTORY_PRODUCT_NOT_FOUND",
          message: "Selected product does not exist.",
          status: 404,
          field: "productId",
        })
      }
    }

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

    let resolvedLocationWarehouseId: string | null = null
    const locationChanged =
      input.locationId !== undefined && (input.locationId ?? "") !== current.locationId
    if (locationChanged && mergedLocationId) {
      const location = await getLocationById(mergedLocationId, c)
      if (!location) {
        throw new InventoryExecutionError({
          code: "INVENTORY_LOCATION_NOT_FOUND",
          message: "Selected location does not exist.",
          status: 404,
          field: "locationId",
        })
      }
      resolvedLocationWarehouseId = location.warehouseId
      if (mergedWarehouseId && location.warehouseId !== mergedWarehouseId) {
        throw new InventoryExecutionError({
          code: "INVENTORY_LOCATION_WAREHOUSE_MISMATCH",
          message: "Selected location does not belong to the chosen warehouse.",
          status: 400,
          field: "locationId",
        })
      }
    }

    const dbInput: DbUpdateInventoryInput = {}
    if (input.itemNumber !== undefined) dbInput.itemNumber = input.itemNumber.trim()
    if (input.dyeLot !== undefined) dbInput.dyeLot = emptyToNull(input.dyeLot)
    if (input.stockCount !== undefined) dbInput.stockCount = input.stockCount.trim()
    // NOTE: cost and freight are intentionally NOT forwarded from this use case.
    // They are write-once-at-import fields, editable only through the imports
    // inventory-rows diff while `isImported = false`. Once imported, the values
    // must remain stable for accounting snapshots. See
    // `isInventoryCostLocked` in @builders/domain.
    if (input.notes !== undefined) dbInput.notes = emptyToNull(input.notes)
    if (input.isImported !== undefined) dbInput.isImported = input.isImported
    if (input.warehouseId !== undefined) {
      dbInput.warehouseId = mergedWarehouseId || null
    }
    if (input.locationId !== undefined) {
      dbInput.locationId = mergedLocationId
      // Source-of-truth rule: if location changed and caller didn't also send a
      // warehouseId, re-stamp warehouseId from the resolved location.
      if (locationChanged && mergedLocationId && !warehouseChanged) {
        dbInput.warehouseId = resolvedLocationWarehouseId
      }
    }

    return updateInventory(id, dbInput, c)
  })
}
