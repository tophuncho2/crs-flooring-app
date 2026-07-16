import {
  Prisma,
  getAdjustmentById,
  getAdjustmentMutableStateById,
  getInventoryParentContextForAdjustments,
  lockInventoryForAdjustment,
  recomputeAndPersistNetDeducted,
  updateAdjustmentRow,
  withDatabaseTransaction,
  type UpdateAdjustmentRowPatch,
} from "@builders/db"
import {
  assertAdjustmentExpectedUpdatedAtMatches,
  assertNetDeductedWithinStartingStock,
  describeAdjustmentFormIssues,
  InventoryAdjustmentDomainError,
  validateAdjustmentForm,
} from "@builders/domain"
import { assertActorEmail } from "../../shared/assert-actor-email.js"
import { InventoryAdjustmentExecutionError } from "./errors.js"
import { assertAdjustmentScope } from "./scope.js"
import type {
  AdjustmentMutationResult,
  UpdateAdjustmentInput,
} from "./types.js"

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export async function updateAdjustmentUseCase(
  input: UpdateAdjustmentInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<AdjustmentMutationResult> {
  assertActorEmail(actorEmail, "updateAdjustmentUseCase")

  // The tx holds locks + the lean update + the ledger recompute + the ceiling
  // assert. It returns a lean carrier (the resolved `netDeducted` differs by
  // path — snapshot for a metadata-only edit, recomputed for a chain-touching
  // one); the full record is enriched ONCE on the pool after commit. In-tx reads
  // stay relation-free (mutable-state slice) or single-relation (parent context)
  // and are awaited sequentially so no concurrent sub-query hits the pinned
  // connection.
  const carrier = await withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const existing = await getAdjustmentMutableStateById(input.adjustmentId, c)
    if (!existing) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
        message: "Inventory adjustment not found",
        status: 404,
      })
    }

    assertAdjustmentScope(input.scope, {
      workOrderId: existing.workOrderId,
      inventoryId: existing.inventoryId,
    })

    // Every field — quantity, the metadata trio, and the WO link — is freely
    // editable for the whole lifecycle of the row; there is no finalize/freeze.
    // The WO link is a plain `workOrderId` (any product, any direction), so no
    // linkage/product invariant applies.
    try {
      assertAdjustmentExpectedUpdatedAtMatches({
        rowUpdatedAt: existing.updatedAt,
        expected: input.expectedUpdatedAt,
      })
    } catch (error) {
      if (error instanceof InventoryAdjustmentDomainError) {
        throw new InventoryAdjustmentExecutionError({
          code: "INVENTORY_ADJUSTMENT_STALE",
          message:
            "Inventory adjustment was modified by someone else; refresh and try again",
          status: 409,
          payload: {
            adjustmentId: existing.id,
            expected: input.expectedUpdatedAt,
            actual: existing.updatedAt,
          },
        })
      }
      throw error
    }

    const mergedQuantity =
      input.patch.quantity !== undefined ? input.patch.quantity : existing.quantity
    const formIssues = validateAdjustmentForm({ quantity: mergedQuantity })
    if (formIssues.length > 0) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_VALIDATION_FAILED",
        message: describeAdjustmentFormIssues(formIssues),
        status: 400,
        payload: { issues: formIssues },
      })
    }

    await lockInventoryForAdjustment(c, existing.inventoryId)

    // Read the parent inventory context under the lock (single-relation, safe on
    // the tx) — supplies the ceiling's startingStock/unitAbbrev and the snapshot
    // currentNetDeducted the metadata-only path returns.
    const inventory = await getInventoryParentContextForAdjustments(c, existing.inventoryId)
    if (!inventory) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
        message: "Parent inventory not found",
        status: 404,
      })
    }

    // Stamp the editor unconditionally — the write primitive sets updatedBy
    // before the recompute branch, so even a metadata-only edit (the
    // `!chainTouched` short-circuit below) correctly records its author.
    const patch: UpdateAdjustmentRowPatch = { updatedBy: actorEmail }
    if (input.patch.quantity !== undefined) {
      patch.quantity = input.patch.quantity
    }
    if (input.patch.adjustmentType !== undefined) {
      patch.adjustmentType = input.patch.adjustmentType
    }
    if (input.patch.isWaste !== undefined) patch.isWaste = input.patch.isWaste
    if (input.patch.internalNotes !== undefined) patch.internalNotes = input.patch.internalNotes
    // Non-semantic palette tag — metadata only, leaves the ledger chain untouched.
    if (input.patch.color !== undefined) patch.color = input.patch.color
    // Location is user-owned free text — written only when the patch carries it,
    // never re-snapped from the parent inventory.
    if (input.patch.location !== undefined) patch.location = input.patch.location
    // Area is user-owned free text — metadata only, leaves the ledger untouched.
    if (input.patch.area !== undefined) patch.area = input.patch.area
    if (input.patch.link !== undefined) {
      patch.workOrderId = input.patch.link.workOrderId
    }
    // Conversion trio — metadata only (convertedBalance derives on read); empty
    // clears the FK. Never moves the ledger chain.
    if (input.patch.coverageUnitId !== undefined) {
      patch.coverageUnitId = emptyToNull(input.patch.coverageUnitId)
    }
    if (input.patch.coveragePerUnit !== undefined) {
      patch.coveragePerUnit = emptyToNull(input.patch.coveragePerUnit)
    }
    if (input.patch.conversionFormulaId !== undefined) {
      patch.conversionFormulaId = emptyToNull(input.patch.conversionFormulaId)
    }

    await updateAdjustmentRow(c, { id: existing.id, patch })

    // Only quantity + direction move the running balance. A metadata-only edit
    // (internalNotes / isWaste / location / link) leaves the whole before/after chain
    // and netDeducted untouched, so skip the ledger replay + ceiling re-check
    // and carry the inventory's existing netDeducted out of the tx.
    const chainTouched =
      input.patch.quantity !== undefined || input.patch.adjustmentType !== undefined
    if (!chainTouched) {
      return {
        adjustmentId: existing.id,
        inventoryId: existing.inventoryId,
        netDeducted: inventory.currentNetDeducted,
      }
    }

    const recomputed = await recomputeAndPersistNetDeducted(c, [existing.inventoryId])
    const result = recomputed[0]
    if (!result) {
      throw new InventoryAdjustmentDomainError(
        "INVENTORY_ADJUSTMENT_NET_DEDUCTED_EXCEEDS_STARTING_STOCK",
        {
          reason: "recompute returned no rows",
          inventoryId: existing.inventoryId,
        },
      )
    }
    try {
      assertNetDeductedWithinStartingStock({
        netDeducted: result.netDeducted,
        startingStock: inventory.startingStock,
      })
    } catch (error) {
      if (
        error instanceof InventoryAdjustmentDomainError &&
        error.code === "INVENTORY_ADJUSTMENT_NET_DEDUCTED_EXCEEDS_STARTING_STOCK"
      ) {
        const unit = inventory.unitAbbrev ? ` ${inventory.unitAbbrev}` : ""
        throw new InventoryAdjustmentExecutionError({
          code: "INVENTORY_ADJUSTMENT_EXCEEDS_INVENTORY",
          message: `Adjustment exceeds available inventory: net deducted would be ${result.netDeducted}${unit} but only ${inventory.startingStock}${unit} is available.`,
          status: 400,
          payload: {
            inventoryId: result.inventoryId,
            netDeducted: result.netDeducted,
            startingStock: inventory.startingStock,
          },
        })
      }
      throw error
    }

    return {
      adjustmentId: existing.id,
      inventoryId: result.inventoryId,
      netDeducted: result.netDeducted,
    }
  })

  // ONE pool enrich after commit, serving both paths (the recompute rewrote this
  // row's `before`/`after` on the chain-touching path, so the fresh full record
  // carries the up-to-date ledger values).
  const adjustment = await getAdjustmentById(carrier.adjustmentId)
  if (!adjustment) {
    throw new InventoryAdjustmentExecutionError({
      code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
      message: "Inventory adjustment not found",
      status: 404,
    })
  }

  return {
    adjustment,
    inventoryId: carrier.inventoryId,
    netDeducted: carrier.netDeducted,
  }
}
