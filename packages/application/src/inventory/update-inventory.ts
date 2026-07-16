import {
  Prisma,
  getInventoryMutableStateById,
  lockInventoryRow,
  updateInventoryRecord,
  withDatabaseTransaction,
  type UpdateInventoryRecordInput as DbUpdateInventoryInput,
} from "@builders/db"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { InventoryExecutionError } from "./errors.js"
import type { UpdateInventoryInput } from "./types.js"

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

// Returns a lean `{ id }`. The only caller (the primary/section route) needs the
// full DETAIL record (row + adjustments) for the record-view reconciler, which it
// reads once via `getInventoryDetailById` at the response boundary — so a row
// enrich here would be a wasted third multi-relation read over the WAN dev DB.
export async function updateInventoryUseCase(
  id: string,
  input: UpdateInventoryInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<{ id: string }> {
  assertActorEmail(actorEmail, "updateInventoryUseCase")

  await withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    await lockInventoryRow(c, id)

    // Lean, relation-free read on the tx connection (existence + the two text
    // fields). A multi-relation read here would trip Prisma's concurrent relation
    // sub-queries on the single pinned connection; the full record is read on the
    // pool after commit (below).
    const current = await getInventoryMutableStateById(id, c)
    if (!current) {
      throw new InventoryExecutionError({
        code: "INVENTORY_NOT_FOUND",
        message: "Inventory row not found.",
        status: 404,
      })
    }

    const effectiveLocation =
      input.location !== undefined
        ? emptyToNull(input.location)
        : current.location === ""
          ? null
          : current.location
    const effectiveInternalNotes =
      input.internalNotes !== undefined
        ? emptyToNull(input.internalNotes)
        : current.internalNotes === ""
          ? null
          : current.internalNotes

    const dbInput: DbUpdateInventoryInput = { updatedBy: actorEmail }
    if (input.location !== undefined) dbInput.location = effectiveLocation
    if (input.internalNotes !== undefined) dbInput.internalNotes = effectiveInternalNotes
    if (input.isArchived !== undefined) dbInput.isArchived = input.isArchived
    // Non-semantic palette tag — metadata only, leaves stock/netDeducted untouched.
    if (input.color !== undefined) dbInput.color = input.color
    // Conversion trio — editable post-create; empty clears (FK disconnect). The
    // converted balance is derived on read, so no recompute is triggered here.
    if (input.coverageUnitId !== undefined) {
      dbInput.coverageUnitId = emptyToNull(input.coverageUnitId)
    }
    if (input.coveragePerUnit !== undefined) {
      dbInput.coveragePerUnit = emptyToNull(input.coveragePerUnit)
    }
    if (input.conversionFormulaId !== undefined) {
      dbInput.conversionFormulaId = emptyToNull(input.conversionFormulaId)
    }

    await updateInventoryRecord(id, dbInput, c)
  })

  return { id }
}
