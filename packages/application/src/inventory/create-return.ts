import {
  Prisma,
  getAdjustmentById,
  getInventoryById,
  getInventoryParentContextForAdjustments,
  getProductById,
  getUnitOfMeasureById,
  getWarehouseById,
  insertAdjustmentRow,
  insertInventoryRow,
  recomputeAndPersistNetDeducted,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertNetDeductedWithinStartingStock,
  buildAdjustmentInventorySnapshot,
  buildReturnInventoryInsert,
  describeReturnCreateIssues,
  InventoryAdjustmentDomainError,
  validateCreateReturnEdits,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { guardUnitsExist } from "../shared/guard-units-exist.js"
import { InventoryExecutionError } from "./errors.js"
import type { CreateReturnInput, CreateReturnResult } from "./types.js"

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

/**
 * Create a "return": one NEW inventory row (`startingStock` "0", `cost`/`freight`
 * null) PLUS exactly one INCREASE adjustment (`quantity` = the returned amount)
 * on that brand-new row — both inside ONE transaction.
 *
 * No lock (the row is brand-new; nothing else can contend) and no outbox. Unlike
 * a plain adjustment, cost/freight are stamped null directly — the parent's
 * `startingStock` is "0", so `computeAdjustmentMoneyShare` would divide by zero.
 * Composes the DATA PRIMITIVES on one connection (not the create-inventory /
 * create-adjustment use cases, whose post-commit enrichment reads would run on
 * the pool against a row not yet visible).
 */
export async function createReturnUseCase(
  input: CreateReturnInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<CreateReturnResult> {
  assertActorEmail(actorEmail, "createReturnUseCase")

  const issues = validateCreateReturnEdits(input)
  if (issues.length > 0) {
    throw new InventoryExecutionError({
      code: "INVENTORY_VALIDATION_FAILED",
      message: describeReturnCreateIssues(issues),
      status: 422,
      payload: { issues },
    })
  }

  // Existence guards read on the pool — pure validation (no relation data), and a
  // relation-rich read on the tx connection would trip Prisma's concurrent
  // relation sub-queries. The insert FK-guards regardless.
  const product = await getProductById(input.productId)
  if (!product) {
    throw new InventoryExecutionError({
      code: "INVENTORY_PRODUCT_NOT_FOUND",
      message: "Product not found.",
      status: 404,
    })
  }

  const warehouse = await getWarehouseById(input.warehouseId)
  if (!warehouse) {
    throw new InventoryExecutionError({
      code: "INVENTORY_WAREHOUSE_NOT_FOUND",
      message: "Warehouse not found.",
      status: 404,
    })
  }

  await guardUnitsExist(
    [input.unitId],
    (unitId) => getUnitOfMeasureById(unitId),
    (unitId) =>
      new InventoryExecutionError({
        code: "INVENTORY_UNIT_NOT_FOUND",
        message: "Selected unit was not found.",
        status: 404,
        field: "unitId",
        payload: { unitId },
      }),
  )

  const insertFields = buildReturnInventoryInsert(input)
  // One Location field feeds both rows — the same value stamped on the adjustment.
  const adjustmentLocation = emptyToNull(input.location)
  // Pin createdAt to the creation instant — it's the row's FIFO position.
  const now = new Date()

  const carrier = await withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const created = await insertInventoryRow(c, {
      ...insertFields,
      createdAt: now,
      createdBy: actorEmail,
      updatedBy: actorEmail,
    })

    // Re-read the just-inserted row on the SAME tx connection — `inventoryNumber`
    // is a DB-sequence value unknown at insert time, and the snapshot needs it.
    // This is the exact single-relation read createAdjustmentUseCase uses, so it
    // is safe on the pinned connection.
    const ctx = await getInventoryParentContextForAdjustments(c, created.id)
    if (!ctx) {
      throw new Error(`createReturnUseCase: inventory ${created.id} not found after insert`)
    }

    const inserted = await insertAdjustmentRow(c, {
      adjustmentType: "INCREASE",
      workOrderId: input.workOrderId ?? null,
      inventoryId: created.id,
      quantity: input.returnedQuantity,
      isWaste: input.isWaste ?? false,
      internalNotes: "",
      ...(input.color !== undefined ? { color: input.color } : {}),
      // A return carries no cost/freight — stamp null directly (do NOT call
      // computeAdjustmentMoneyShare; startingStock "0" would divide by zero).
      cost: null,
      freight: null,
      unitSnapshot: { unitId: ctx.unitId },
      coverageUnitId: ctx.coverageUnitId,
      coveragePerUnit: ctx.coveragePerUnit,
      conversionFormulaId: ctx.conversionFormulaId,
      inventorySnapshot: buildAdjustmentInventorySnapshot({
        inventoryNumber: ctx.inventoryNumber,
        rollPrefix: ctx.rollPrefix,
        rollNumber: ctx.rollNumber,
        dyeLot: ctx.dyeLot,
        inventoryNote: ctx.inventoryNote,
        productId: ctx.productId,
        warehouseId: ctx.warehouseId,
      }),
      location: adjustmentLocation,
      area: emptyToNull(input.area),
      createdBy: actorEmail,
      updatedBy: actorEmail,
    })

    const recomputed = await recomputeAndPersistNetDeducted(c, [created.id])
    const result = recomputed[0]
    if (!result) {
      throw new InventoryAdjustmentDomainError(
        "INVENTORY_ADJUSTMENT_NET_DEDUCTED_EXCEEDS_STARTING_STOCK",
        { reason: "recompute returned no rows", inventoryId: created.id },
      )
    }

    // Trivially satisfied — an INCREASE on a "0" row drives netDeducted negative,
    // always ≤ startingStock. Asserted for parity with the create-adjustment path.
    assertNetDeductedWithinStartingStock({
      netDeducted: result.netDeducted,
      startingStock: "0",
    })

    return { inventoryId: created.id, adjustmentId: inserted.id }
  })

  // Enrich the full records on the pool after commit — multi-relation reads must
  // not run on the pinned tx connection.
  const inventory = await getInventoryById(carrier.inventoryId)
  if (!inventory) {
    throw new Error(
      `createReturnUseCase: inventory ${carrier.inventoryId} not found after insert`,
    )
  }
  const adjustment = await getAdjustmentById(carrier.adjustmentId)
  if (!adjustment) {
    throw new Error(
      `createReturnUseCase: adjustment ${carrier.adjustmentId} not found after insert`,
    )
  }

  return { inventory, adjustment }
}
