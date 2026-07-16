import {
  Prisma,
  getIndicatorById,
  getProductById,
  getUnitOfMeasureById,
  getWarehouseById,
  insertIndicatorRow,
} from "@builders/db"
import {
  describeIndicatorFormIssues,
  normalizeMoneyAmount,
  validateIndicatorCreateForm,
} from "@builders/domain"
import { assertActorEmail } from "../../shared/assert-actor-email.js"
import { isP2002 } from "../../shared/prisma-errors.js"
import { withTxThenEnrich } from "../../shared/with-tx-then-enrich.js"
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

  // Product existence on the POOL — getProductById pulls 6 relations, so it must
  // not run on the pinned tx connection. The productId FK RESTRICT backstops the
  // check→write window.
  if (!(await getProductById(input.productId))) {
    throw new InventoryIndicatorExecutionError({
      code: "INVENTORY_INDICATOR_PRODUCT_NOT_FOUND",
      message: "Product was not found",
      status: 404,
      field: "productId",
    })
  }

  // Money-standard normalize at the write boundary ("" stays "" → null column).
  const lowStockThreshold = input.lowStockThreshold.trim()
    ? normalizeMoneyAmount(input.lowStockThreshold)
    : ""

  // The relation-free warehouse/unit guards + the lean insert run in the tx; the
  // full multi-relation record is read on the POOL after commit.
  try {
    return await withTxThenEnrich(
      async (c) => {
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

        return insertIndicatorRow(c, {
          productId: input.productId,
          warehouseId: input.warehouseId,
          unitId: input.unitId,
          lowStockThreshold,
          internalNotes: input.internalNotes,
          isActive: input.isActive,
          createdBy: actorEmail,
          updatedBy: actorEmail,
        })
      },
      ({ id }) => getIndicatorById(id),
      () => {
        throw new InventoryIndicatorExecutionError({
          code: "INVENTORY_INDICATOR_NOT_FOUND",
          message: "Inventory indicator not found",
          status: 404,
        })
      },
      { client },
    )
  } catch (error) {
    // One indicator per (product, warehouse, unit) triple — a duplicate hits the
    // DB @@unique inside the tx. Surface it as a friendly 409, not a raw Prisma error.
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
}
