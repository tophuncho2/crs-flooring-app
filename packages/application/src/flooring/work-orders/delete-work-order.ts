import { Prisma, deleteWorkOrderRecordById, withDatabaseTransaction } from "@builders/db"
import { WORK_ORDER_NOT_FOUND_MESSAGE } from "@builders/domain"
import { WorkOrderExecutionError } from "./errors.js"

/**
 * Deletes a work order. The WO row's `onDelete: Cascade` cascades to all
 * its WOMIs; each WOMI's `onDelete: SetNull` on the adjustment relation
 * nulls `workOrderItemId`, and the WO's own SetNull cascade nulls
 * `workOrderId`. So both link columns end up null together on every
 * previously-linked inventory adjustment — `assertAdjustmentLinkageRules`
 * is satisfied without any app-side null updates.
 *
 * Per locked decision: WO delete is unblocked even when adjustments
 * exist; the SetNull cascade is the unlink mechanism.
 */
export async function deleteWorkOrderUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    try {
      await deleteWorkOrderRecordById(id, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new WorkOrderExecutionError({
          code: "WORK_ORDER_NOT_FOUND",
          message: WORK_ORDER_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }

    return { ok: true }
  })
}
