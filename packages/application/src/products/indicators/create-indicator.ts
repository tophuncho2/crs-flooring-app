import {
  Prisma,
  getProductById,
  getUnitOfMeasureById,
  getWarehouseById,
  insertIndicatorRow,
  withDatabaseTransaction,
} from "@builders/db"
import {
  describeIndicatorFormIssues,
  normalizeMoneyAmount,
  validateIndicatorCreateForm,
} from "@builders/domain"
import { assertActorEmail } from "../../shared/assert-actor-email.js"
import { isP2002 } from "../../shared/prisma-errors.js"
import { InventoryIndicatorExecutionError } from "./errors.js"
import type { CreateIndicatorInput, IndicatorMutationResult } from "./types.js"

export async function createIndicatorUseCase(
  input: CreateIndicatorInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<IndicatorMutationResult> {
  assertActorEmail(actorEmail, "createIndicatorUseCase")

  const issues = validateIndicatorCreateForm({
    warehouseId: input.warehouseId,
    unitId: input.unitId,
    lowStockThreshold: input.lowStockThreshold,
    internalNotes: input.internalNotes,
    isActive: input.isActive,
  })
  if (issues.length > 0) {
    throw new InventoryIndicatorExecutionError({
      code: "INVENTORY_INDICATOR_VALIDATION_FAILED",
      message: describeIndicatorFormIssues(issues),
      status: 400,
      payload: { issues },
    })
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (!(await getProductById(input.productId, c))) {
      throw new InventoryIndicatorExecutionError({
        code: "INVENTORY_INDICATOR_PRODUCT_NOT_FOUND",
        message: "Product was not found",
        status: 404,
        field: "productId",
      })
    }
    if (!(await getWarehouseById(input.warehouseId, c))) {
      throw new InventoryIndicatorExecutionError({
        code: "INVENTORY_INDICATOR_WAREHOUSE_NOT_FOUND",
        message: "Selected warehouse was not found",
        status: 400,
        field: "warehouseId",
      })
    }
    if (!(await getUnitOfMeasureById(input.unitId, c))) {
      throw new InventoryIndicatorExecutionError({
        code: "INVENTORY_INDICATOR_UNIT_NOT_FOUND",
        message: "Selected unit was not found",
        status: 400,
        field: "unitId",
      })
    }

    // Money-standard normalize at the write boundary ("" stays "" → null column).
    const lowStockThreshold = input.lowStockThreshold.trim()
      ? normalizeMoneyAmount(input.lowStockThreshold)
      : ""

    try {
      return await insertIndicatorRow(c, {
        productId: input.productId,
        warehouseId: input.warehouseId,
        unitId: input.unitId,
        lowStockThreshold,
        internalNotes: input.internalNotes,
        isActive: input.isActive,
        createdBy: actorEmail,
        updatedBy: actorEmail,
      })
    } catch (error) {
      // One indicator per (product, warehouse, unit) triple — a duplicate hits the
      // DB @@unique. Surface it as a friendly 409 rather than a raw Prisma error.
      if (isP2002(error)) {
        throw new InventoryIndicatorExecutionError({
          code: "INVENTORY_INDICATOR_DUPLICATE",
          message:
            "An indicator already exists for this product, warehouse, and unit. Edit that one instead.",
          status: 409,
          payload: {
            productId: input.productId,
            warehouseId: input.warehouseId,
            unitId: input.unitId,
          },
        })
      }
      throw error
    }
  })
}
