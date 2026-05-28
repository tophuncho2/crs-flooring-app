import {
  Prisma,
  deleteWorkOrderMaterialItemRecordById,
  withDatabaseTransaction,
} from "@builders/db"
import { WorkOrderMaterialItemExecutionError } from "./errors.js"
import type { DeleteWorkOrderMaterialItemUseCaseInput } from "./types.js"

/**
 * Standalone WOMI delete. The data layer's
 * `deleteWorkOrderMaterialItemRecordById` nulls both linkage columns
 * (workOrderId AND workOrderItemId) on every previously-linked inventory
 * adjustment inside the same TX BEFORE the WOMI row delete fires —
 * preserves `assertAdjustmentLinkageRules`.
 *
 * Per locked sweep decision, WOMI delete is unblocked even when
 * adjustments reference it; the unlink is the cleanup mechanism. This use
 * case therefore has no domain-rule throw to catch.
 */
export async function deleteWorkOrderMaterialItemUseCase(
  input: DeleteWorkOrderMaterialItemUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    try {
      await deleteWorkOrderMaterialItemRecordById(input.id, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new WorkOrderMaterialItemExecutionError({
          code: "WORK_ORDER_MATERIAL_ITEM_NOT_FOUND",
          message: "Work order material item not found",
          status: 404,
        })
      }
      throw error
    }

    return { ok: true }
  })
}
