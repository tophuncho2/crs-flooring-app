import {
  Prisma,
  deleteWorkOrderMaterialItemRecordById,
  withDatabaseTransaction,
} from "@builders/db"
import { WorkOrderMaterialItemExecutionError } from "./errors.js"
import type { DeleteWorkOrderMaterialItemUseCaseInput } from "./types.js"

/**
 * Standalone WOMI delete. Adjustments no longer link to a material item, so the
 * data layer's `deleteWorkOrderMaterialItemRecordById` is a plain row delete —
 * nothing references the WOMI and there is no domain-rule throw to catch.
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
