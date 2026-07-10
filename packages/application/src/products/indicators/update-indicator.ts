import {
  Prisma,
  getIndicatorById,
  lockIndicatorRow,
  updateIndicatorRecord,
  withDatabaseTransaction,
  type UpdateIndicatorRowPatch,
} from "@builders/db"
import {
  assertIndicatorExpectedUpdatedAtMatches,
  describeIndicatorFormIssues,
  InventoryIndicatorDomainError,
  normalizeMoneyAmount,
  validateIndicatorUpdateForm,
} from "@builders/domain"
import { InventoryIndicatorExecutionError } from "./errors.js"
import type { IndicatorMutationResult, UpdateIndicatorInput } from "./types.js"

export async function updateIndicatorUseCase(
  input: UpdateIndicatorInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<IndicatorMutationResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("updateIndicatorUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const existing = await getIndicatorById(input.indicatorId, c)
    if (!existing) {
      throw new InventoryIndicatorExecutionError({
        code: "INVENTORY_INDICATOR_NOT_FOUND",
        message: "Inventory indicator not found",
        status: 404,
      })
    }
    // Scope: the indicator must belong to the addressed product.
    if (existing.productId !== input.productId) {
      throw new InventoryIndicatorExecutionError({
        code: "INVENTORY_INDICATOR_SCOPE_MISMATCH",
        message: "Inventory indicator does not belong to this product",
        status: 404,
      })
    }

    try {
      assertIndicatorExpectedUpdatedAtMatches({
        rowUpdatedAt: existing.updatedAt,
        expected: input.expectedUpdatedAt,
      })
    } catch (error) {
      if (error instanceof InventoryIndicatorDomainError) {
        throw new InventoryIndicatorExecutionError({
          code: "INVENTORY_INDICATOR_STALE",
          message:
            "Inventory indicator was modified by someone else; refresh and try again",
          status: 409,
          payload: {
            indicatorId: existing.id,
            expected: input.expectedUpdatedAt,
            actual: existing.updatedAt,
          },
        })
      }
      throw error
    }

    const mergedThreshold =
      input.patch.lowStockThreshold !== undefined
        ? input.patch.lowStockThreshold
        : existing.lowStockThreshold
    const mergedInternalNotes =
      input.patch.internalNotes !== undefined ? input.patch.internalNotes : existing.internalNotes
    const mergedIsActive =
      input.patch.isActive !== undefined ? input.patch.isActive : existing.isActive

    const issues = validateIndicatorUpdateForm({
      lowStockThreshold: mergedThreshold,
      internalNotes: mergedInternalNotes,
      isActive: mergedIsActive,
    })
    if (issues.length > 0) {
      throw new InventoryIndicatorExecutionError({
        code: "INVENTORY_INDICATOR_VALIDATION_FAILED",
        message: describeIndicatorFormIssues(issues),
        status: 400,
        payload: { issues },
      })
    }

    await lockIndicatorRow(c, existing.id)

    const patch: UpdateIndicatorRowPatch = { updatedBy: actorEmail }
    if (input.patch.lowStockThreshold !== undefined) {
      patch.lowStockThreshold = input.patch.lowStockThreshold.trim()
        ? normalizeMoneyAmount(input.patch.lowStockThreshold)
        : ""
    }
    if (input.patch.internalNotes !== undefined) patch.internalNotes = input.patch.internalNotes
    if (input.patch.isActive !== undefined) patch.isActive = input.patch.isActive

    return updateIndicatorRecord(c, { id: existing.id, patch })
  })
}
