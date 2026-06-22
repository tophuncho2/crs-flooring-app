import {
  Prisma,
  getInventoryById,
  lockInventoryRow,
  updateInventoryRecord,
  withDatabaseTransaction,
  type UpdateInventoryRecordInput as DbUpdateInventoryInput,
} from "@builders/db"
import { InventoryExecutionError } from "./errors.js"
import type { InventoryResult, UpdateInventoryInput } from "./types.js"

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export async function updateInventoryUseCase(
  id: string,
  input: UpdateInventoryInput,
  client?: Prisma.TransactionClient,
): Promise<InventoryResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    await lockInventoryRow(c, id)

    const current = await getInventoryById(id, c)
    if (!current) {
      throw new InventoryExecutionError({
        code: "INVENTORY_NOT_FOUND",
        message: "Inventory row not found.",
        status: 404,
      })
    }

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

    const dbInput: DbUpdateInventoryInput = {}
    if (input.rollNumber !== undefined) dbInput.rollNumber = effectiveRollNumber
    if (input.dyeLot !== undefined) dbInput.dyeLot = effectiveDyeLot
    if (input.location !== undefined) dbInput.location = effectiveLocation
    if (input.note !== undefined) dbInput.note = effectiveNote
    if (input.internalNotes !== undefined) dbInput.internalNotes = effectiveInternalNotes
    if (input.isArchived !== undefined) dbInput.isArchived = input.isArchived

    return updateInventoryRecord(id, dbInput, c)
  })
}
