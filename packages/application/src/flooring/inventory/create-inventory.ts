import {
  Prisma,
  getProductById,
  getWarehouseById,
  insertInventoryRow,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildCreatedInventoryInsert,
  describeInventoryCreateIssues,
  validateCreateInventoryEdits,
} from "@builders/domain"
import { InventoryExecutionError } from "./errors.js"
import type { CreateInventoryInput, InventoryResult } from "./types.js"

export async function createInventoryUseCase(
  input: CreateInventoryInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<InventoryResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("createInventoryUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const issues = validateCreateInventoryEdits(input)
    if (issues.length > 0) {
      throw new InventoryExecutionError({
        code: "INVENTORY_VALIDATION_FAILED",
        message: describeInventoryCreateIssues(issues),
        status: 422,
        payload: { issues },
      })
    }

    const product = await getProductById(input.productId, c)
    if (!product) {
      throw new InventoryExecutionError({
        code: "INVENTORY_PRODUCT_NOT_FOUND",
        message: "Product not found.",
        status: 404,
      })
    }

    const warehouse = await getWarehouseById(input.warehouseId, c)
    if (!warehouse) {
      throw new InventoryExecutionError({
        code: "INVENTORY_WAREHOUSE_NOT_FOUND",
        message: "Warehouse not found.",
        status: 404,
      })
    }

    const fields = buildCreatedInventoryInsert(
      {
        stockUnitName: product.stockUnitName,
        stockUnitAbbrev: product.stockUnitAbbrev,
        sendUnitName: product.sendUnitName,
        sendUnitAbbrev: product.sendUnitAbbrev,
      },
      input,
    )

    // Pin createdAt to the creation instant — it's the row's FIFO position.
    const now = new Date()
    return insertInventoryRow(c, {
      ...fields,
      createdAt: now,
      createdBy: actorEmail,
      updatedBy: actorEmail,
    })
  })
}
