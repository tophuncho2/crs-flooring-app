import type { Prisma } from "../../../generated/prisma/client.js"
import { db } from "../../../client.js"
import { type StagedInventoryDbClient } from "./shared.js"
import {
  getStagedInventoryById,
  type StagedInventoryRecord,
} from "./read-repository.js"

/**
 * Create input for a staged inventory row. Application layer resolves all
 * snapshots before invoking:
 *  - `productId` from the draft, with `unitId` seeded from that FlooringProduct
 *    on create (UoM epic 2B — replaces the frozen `stockUnit*` label snapshots).
 *  - `rollPrefix` defaults server-side to "ROLL#".
 *
 * Warehouse is parent-owned (the import entry's) — no longer stored per row.
 * `unitId` is user-editable on the per-row update path (see
 * `UpdateStagedInventoryRecordInput`); product is not.
 */
export type CreateStagedInventoryRecordInput = {
  importEntryId: string
  productId: string
  unitId: string | null
  rollNumber: string | null
  dyeLot: string | null
  location: string | null
  startingStock: Prisma.Decimal | string | number
  cost: Prisma.Decimal | string | number | null
  freight: Prisma.Decimal | string | number | null
  note: string | null
}

/**
 * Update input for a staged inventory row. Only user-editable fields appear
 * here; productId is immutable after create. `unitId` is now editable
 * (UoM epic 2B) — "" / null disconnects the unit.
 */
export type UpdateStagedInventoryRecordInput = {
  unitId?: string | null
  rollNumber?: string | null
  dyeLot?: string | null
  location?: string | null
  startingStock?: Prisma.Decimal | string | number
  cost?: Prisma.Decimal | string | number | null
  freight?: Prisma.Decimal | string | number | null
  note?: string | null
}

export async function createStagedInventoryRecord(
  input: CreateStagedInventoryRecordInput,
  client: StagedInventoryDbClient = db,
): Promise<StagedInventoryRecord> {
  const row = await client.flooringImportStagedInventoryRow.create({
    data: {
      importEntry: { connect: { id: input.importEntryId } },
      product: { connect: { id: input.productId } },
      ...(input.unitId ? { unit: { connect: { id: input.unitId } } } : {}),
      rollNumber: input.rollNumber,
      dyeLot: input.dyeLot,
      location: input.location,
      startingStock: input.startingStock,
      cost: input.cost,
      freight: input.freight,
      note: input.note,
    },
    select: { id: true },
  })
  const record = await getStagedInventoryById(row.id, client)
  if (!record) {
    throw new Error("createStagedInventoryRecord: record disappeared mid-transaction")
  }
  return record
}

function buildUpdateData(
  input: UpdateStagedInventoryRecordInput,
): Prisma.FlooringImportStagedInventoryRowUpdateInput {
  const data: Prisma.FlooringImportStagedInventoryRowUpdateInput = {}
  if (input.unitId !== undefined) {
    data.unit =
      input.unitId && input.unitId.trim() !== ""
        ? { connect: { id: input.unitId } }
        : { disconnect: true }
  }
  if (input.rollNumber !== undefined) data.rollNumber = input.rollNumber
  if (input.dyeLot !== undefined) data.dyeLot = input.dyeLot
  if (input.location !== undefined) data.location = input.location
  if (input.startingStock !== undefined) data.startingStock = input.startingStock
  if (input.cost !== undefined) data.cost = input.cost
  if (input.freight !== undefined) data.freight = input.freight
  if (input.note !== undefined) data.note = input.note
  return data
}

export async function updateStagedInventoryRecord(
  id: string,
  input: UpdateStagedInventoryRecordInput,
  client: StagedInventoryDbClient = db,
): Promise<StagedInventoryRecord> {
  const data = buildUpdateData(input)
  if (Object.keys(data).length > 0) {
    await client.flooringImportStagedInventoryRow.update({
      where: { id },
      data,
      select: { id: true },
    })
  }
  const record = await getStagedInventoryById(id, client)
  if (!record) {
    throw new Error(`updateStagedInventoryRecord: row ${id} not found after update`)
  }
  return record
}

export async function deleteStagedInventoryRecordById(
  id: string,
  client: StagedInventoryDbClient = db,
): Promise<void> {
  await client.flooringImportStagedInventoryRow.delete({ where: { id } })
}

// --- Mark-for-import primitive ---

/**
 * Transactional primitive: flips a batch of staged rows from status="DRAFT"
 * to status="QUEUED".
 *
 * Caller contract (application layer):
 *  - Opens the transaction via `withDatabaseTransaction` and locks the parent
 *    import row FOR UPDATE before invoking. Without that lock, concurrent
 *    callers could each pre-read the same row as eligible and double-queue.
 *  - Validated readiness via `validateStagedImportBatch` (domain) — every row
 *    in `stagedRowIds` should already pass `getStagedRowImportabilityBlocker`.
 *    The pre-read here is the data-layer's last-line defense, not a substitute
 *    for the domain check.
 *
 * Result split:
 *  - `markedRowIds`: rows that were eligible at pre-read AND received the
 *    update.
 *  - `skippedRowIds`: every input ID not in `markedRowIds` — includes rows in
 *    a non-DRAFT state, rows already imported, rows belonging to a different
 *    import, and rows that don't exist. The use case surfaces precise per-row
 *    UI feedback from this list; it does not need to know which sub-reason
 *    triggered the skip (the domain validator should have caught those first).
 */
export type MarkStagedRowsForImportInput = {
  importEntryId: string
  stagedRowIds: string[]
}

export type MarkStagedRowsForImportResult = {
  markedRowIds: string[]
  skippedRowIds: string[]
}

export async function markStagedRowsForImport(
  tx: Prisma.TransactionClient,
  input: MarkStagedRowsForImportInput,
): Promise<MarkStagedRowsForImportResult> {
  // Step 1 — pre-read eligible rows (within the transaction's lock scope).
  const eligibleBefore = await tx.flooringImportStagedInventoryRow.findMany({
    where: {
      id: { in: input.stagedRowIds },
      importEntryId: input.importEntryId,
      status: "DRAFT",
    },
    select: { id: true },
  })
  const eligibleIds = new Set(eligibleBefore.map((row) => row.id))

  // Step 2 — conditional bulk update with the same WHERE clause.
  if (eligibleIds.size > 0) {
    await tx.flooringImportStagedInventoryRow.updateMany({
      where: {
        id: { in: Array.from(eligibleIds) },
        importEntryId: input.importEntryId,
        status: "DRAFT",
      },
      data: { status: "QUEUED" },
    })
  }

  // Step 3 — derive split.
  const markedRowIds = Array.from(eligibleIds)
  const skippedRowIds = input.stagedRowIds.filter((id) => !eligibleIds.has(id))
  return { markedRowIds, skippedRowIds }
}
