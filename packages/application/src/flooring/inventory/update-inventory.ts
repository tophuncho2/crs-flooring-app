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
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<InventoryResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("updateInventoryUseCase requires a non-empty actorEmail")
  }

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

    return updateInventoryRecord(id, dbInput, c)
  })
}
