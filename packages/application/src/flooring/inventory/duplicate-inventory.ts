import {
  Prisma,
  getInventoryById,
  insertInventoryRow,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildDuplicatedInventoryInsert,
  describeInventoryDuplicateIssues,
  validateDuplicateInventoryEdits,
} from "@builders/domain"
import { InventoryExecutionError } from "./errors.js"
import type { DuplicateInventoryInput, InventoryResult } from "./types.js"

export async function duplicateInventoryUseCase(
  sourceId: string,
  input: DuplicateInventoryInput,
  client?: Prisma.TransactionClient,
): Promise<InventoryResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const issues = validateDuplicateInventoryEdits(input)
    if (issues.length > 0) {
      throw new InventoryExecutionError({
        code: "INVENTORY_VALIDATION_FAILED",
        message: describeInventoryDuplicateIssues(issues),
        status: 422,
        payload: { issues },
      })
    }

    const source = await getInventoryById(sourceId, c)
    if (!source) {
      throw new InventoryExecutionError({
        code: "INVENTORY_NOT_FOUND",
        message: "Inventory row not found.",
        status: 404,
      })
    }

    const fields = buildDuplicatedInventoryInsert(source, input)
    return insertInventoryRow(c, {
      ...fields,
      fifoReceivedAt: new Date(),
    })
  })
}
