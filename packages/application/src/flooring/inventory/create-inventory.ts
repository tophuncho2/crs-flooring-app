import {
  Prisma,
  getProductById,
  getUnitOfMeasureById,
  getWarehouseById,
  insertInventoryRow,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildCreatedInventoryInsert,
  describeInventoryCreateIssues,
  validateCreateInventoryEdits,
} from "@builders/domain"
import { guardUnitsExist } from "../../shared/guard-units-exist.js"
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

    // Unit FK is required on create — assert it still exists before insert.
    await guardUnitsExist(
      [input.unitId],
      (unitId) => getUnitOfMeasureById(unitId, c),
      (unitId) =>
        new InventoryExecutionError({
          code: "INVENTORY_UNIT_NOT_FOUND",
          message: "Selected unit was not found.",
          status: 404,
          field: "unitId",
          payload: { unitId },
        }),
    )

    // Unit is the FK from the create form (seeded from the product, overridable).
    // No longer derived from the product's retiring snapshot strings (UoM epic 2B).
    const fields = buildCreatedInventoryInsert(input)

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
