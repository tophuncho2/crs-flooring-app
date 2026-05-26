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

/**
 * Duplicate an existing inventory row into a brand-new one. The only
 * user-driven inventory-create path (every other row is born from the import
 * worker). Single TX, fully synchronous — no outbox, no FIFO recompaction:
 *   1. Validate the editable fields (pure domain rules).
 *   2. Read the source row — snapshot columns are pasted verbatim. No lock;
 *      the source is read-only here.
 *   3. Build the insert payload (`buildDuplicatedInventoryInsert`): pastes
 *      product / category / UoM / warehouse / dye lot, applies the 5 editable
 *      fields, drops all import provenance to null, starts the row un-cut
 *      (`totalCutSum: 0`) and active (`isArchived: false`). Cut logs do NOT
 *      follow.
 *   4. Insert with `fifoReceivedAt = now()` — the duplicate is a new receipt
 *      at the end of its product's FIFO line. `insertInventoryRow` composes
 *      the `inventoryItem` denorm once the sequence assigns `inventoryNumber`.
 */
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
