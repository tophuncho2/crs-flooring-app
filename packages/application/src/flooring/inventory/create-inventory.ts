import {
  Prisma,
  createInventory,
  getLocationById,
  getProductById,
  getWarehouseById,
  withDatabaseTransaction,
} from "@builders/db"
import {
  describeInventoryValidationIssues,
  validateInventoryInput,
} from "@builders/domain"
import { InventoryExecutionError } from "./errors.js"
import type { CreateInventoryInput, InventoryResult } from "./types.js"

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export async function createInventoryUseCase(
  input: CreateInventoryInput,
  client?: Prisma.TransactionClient,
): Promise<InventoryResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const locationId = input.locationId.trim() || null
    const warehouseId = input.warehouseId.trim()

    const issues = validateInventoryInput(
      {
        productId: input.productId,
        itemNumber: input.itemNumber,
        warehouseId,
        locationId,
        stockCount: input.stockCount,
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

    const product = await getProductById(input.productId, c)
    if (!product) {
      throw new InventoryExecutionError({
        code: "INVENTORY_PRODUCT_NOT_FOUND",
        message: "Selected product does not exist.",
        status: 404,
        field: "productId",
      })
    }

    const warehouse = await getWarehouseById(warehouseId, c)
    if (!warehouse) {
      throw new InventoryExecutionError({
        code: "INVENTORY_WAREHOUSE_NOT_FOUND",
        message: "Selected warehouse does not exist.",
        status: 404,
        field: "warehouseId",
      })
    }

    if (locationId) {
      const location = await getLocationById(locationId, c)
      if (!location) {
        throw new InventoryExecutionError({
          code: "INVENTORY_LOCATION_NOT_FOUND",
          message: "Selected location does not exist.",
          status: 404,
          field: "locationId",
        })
      }
      if (location.warehouseId !== warehouseId) {
        throw new InventoryExecutionError({
          code: "INVENTORY_LOCATION_WAREHOUSE_MISMATCH",
          message: "Selected location does not belong to the chosen warehouse.",
          status: 400,
          field: "locationId",
        })
      }
    }

    return createInventory(
      {
        productId: input.productId,
        itemNumber: input.itemNumber.trim(),
        dyeLot: emptyToNull(input.dyeLot),
        warehouseId,
        locationId,
        stockCount: input.stockCount.trim(),
        cost: emptyToNull(input.cost),
        freight: emptyToNull(input.freight),
        notes: emptyToNull(input.notes),
        importEntryId: null,
        fifoReceivedAt: null,
        isImported: false,
      },
      c,
    )
  })
}
