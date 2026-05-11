import {
  Prisma,
  getInventoryById,
  getWarehouseById,
  lockInventoryRow,
  updateInventoryRecord,
  withDatabaseTransaction,
  type UpdateInventoryRecordInput as DbUpdateInventoryInput,
} from "@builders/db"
import {
  composeInventoryItem,
  describeInventoryFormValidationIssues,
  validateInventoryForm,
} from "@builders/domain"
import { InventoryExecutionError } from "./errors.js"
import type { InventoryResult, UpdateInventoryInput } from "./types.js"

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

/**
 * Update a real-inventory row. Single TX:
 *   1. Lock the row via SELECT FOR UPDATE so concurrent updates serialize.
 *   2. Read current state.
 *   3. If `warehouseId` is changing, assert the new warehouse exists.
 *   4. Validate the merged form (warehouse required).
 *   5. Resolve effective post-patch values. `rollNumber` is stored as the
 *      bare suffix; the display prefix lives in the separate `rollPrefix`
 *      column and is never touched here.
 *   6. Recompose the denormalized `inventoryItem` column from the
 *      post-patch effective values (always — cheap and avoids drift).
 *   7. Write all editable fields + the recomposed `inventoryItem` in a
 *      single update.
 *
 * Location is plain text post-sweep — no FK lookup, no cross-warehouse
 * mismatch check (those rules retired with the FK).
 */
export async function updateInventoryUseCase(
  id: string,
  input: UpdateInventoryInput,
  client?: Prisma.TransactionClient,
): Promise<InventoryResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    // 1. Row lock first — every read below sees a stable snapshot.
    await lockInventoryRow(c, id)

    // 2. Read current state.
    const current = await getInventoryById(id, c)
    if (!current) {
      throw new InventoryExecutionError({
        code: "INVENTORY_NOT_FOUND",
        message: "Inventory row not found.",
        status: 404,
      })
    }

    // 3. Warehouse existence check when changing.
    const mergedWarehouseId = (input.warehouseId ?? current.warehouseId).trim()
    const warehouseChanged =
      input.warehouseId !== undefined && input.warehouseId !== current.warehouseId
    if (warehouseChanged && mergedWarehouseId) {
      const warehouse = await getWarehouseById(mergedWarehouseId, c)
      if (!warehouse) {
        throw new InventoryExecutionError({
          code: "INVENTORY_WAREHOUSE_NOT_FOUND",
          message: "Selected warehouse does not exist.",
          status: 404,
          field: "warehouseId",
        })
      }
    }

    // 4. Form validation (warehouse required).
    const issues = validateInventoryForm({ warehouseId: mergedWarehouseId })
    if (issues.length > 0) {
      throw new InventoryExecutionError({
        code: "INVENTORY_VALIDATION_FAILED",
        message: describeInventoryFormValidationIssues(issues),
        status: 400,
        payload: { issues },
      })
    }

    // 5. Resolve patched fields (effective post-patch values for the composer
    // + the data-layer write input). `null` represents "stored null"; we
    // convert empty strings to null on write per the column's nullable schema.
    // `rollNumber` is the bare suffix — the prefix lives in `rollPrefix`
    // (default `"ROLL#"`) and is never patched by this use case.
    const effectiveRollNumber =
      input.rollNumber !== undefined
        ? emptyToNull(input.rollNumber)
        : current.rollNumber === ""
          ? null
          : current.rollNumber
    const effectiveDyeLot =
      input.dyeLot !== undefined
        ? emptyToNull(input.dyeLot)
        : current.dyeLot === ""
          ? null
          : current.dyeLot
    const effectiveLocation =
      input.location !== undefined
        ? emptyToNull(input.location)
        : current.location === ""
          ? null
          : current.location
    const effectiveNote =
      input.note !== undefined
        ? emptyToNull(input.note)
        : current.note === ""
          ? null
          : current.note
    const effectiveInternalNotes =
      input.internalNotes !== undefined
        ? emptyToNull(input.internalNotes)
        : current.internalNotes === ""
          ? null
          : current.internalNotes

    // 6. Recompose `inventoryItem` from the post-patch effective values.
    // Always recompute — the composer is pure and fast, and an unconditional
    // write avoids drift if a future caller bypasses the patch detection.
    const inventoryItem = composeInventoryItem({
      inventoryNumber: current.inventoryNumber,
      rollPrefix: current.rollPrefix,
      rollNumber: effectiveRollNumber ?? "",
      dyeLot: effectiveDyeLot ?? "",
      note: effectiveNote ?? "",
    })

    // 7. Build the write input — only fields the patch touched (plus the
    // server-recomposed inventoryItem).
    const dbInput: DbUpdateInventoryInput = { inventoryItem }
    if (input.rollNumber !== undefined) dbInput.rollNumber = effectiveRollNumber
    if (input.dyeLot !== undefined) dbInput.dyeLot = effectiveDyeLot
    if (input.location !== undefined) dbInput.location = effectiveLocation
    if (input.note !== undefined) dbInput.note = effectiveNote
    if (input.internalNotes !== undefined) dbInput.internalNotes = effectiveInternalNotes
    if (input.isArchived !== undefined) dbInput.isArchived = input.isArchived
    if (input.warehouseId !== undefined) dbInput.warehouseId = mergedWarehouseId

    return updateInventoryRecord(id, dbInput, c)
  })
}
