import type { Prisma } from "@prisma/client"
import { db } from "../../../client.js"
import { type StagedInventoryDbClient } from "./shared.js"
import {
  getStagedInventoryById,
  listStagedInventoryByImport,
  type StagedInventoryRecord,
} from "./read-repository.js"

/**
 * Create input for a staged inventory row. The use case pre-resolves FKs;
 * `warehouseId` is required (schema-side) and should match the parent import's
 * warehouse (domain validator enforces).
 */
export type CreateStagedInventoryRecordInput = {
  importEntryId: string
  productId: string
  itemNumber: string | null
  dyeLot: string | null
  warehouseId: string
  locationId: string | null
  startingStock: Prisma.Decimal | string | number
  cost: Prisma.Decimal | string | number | null
  freight: Prisma.Decimal | string | number | null
  notes: string | null
}

export type UpdateStagedInventoryRecordInput = Partial<
  Omit<CreateStagedInventoryRecordInput, "importEntryId">
> & {
  isImported?: boolean
}

export async function createStagedInventoryRecord(
  input: CreateStagedInventoryRecordInput,
  client: StagedInventoryDbClient = db,
): Promise<StagedInventoryRecord> {
  const row = await client.flooringImportStagedInventoryRow.create({
    data: {
      importEntry: { connect: { id: input.importEntryId } },
      product: { connect: { id: input.productId } },
      itemNumber: input.itemNumber,
      dyeLot: input.dyeLot,
      warehouse: { connect: { id: input.warehouseId } },
      location: input.locationId ? { connect: { id: input.locationId } } : undefined,
      startingStock: input.startingStock,
      cost: input.cost,
      freight: input.freight,
      notes: input.notes,
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
  if (input.productId !== undefined) {
    data.product = { connect: { id: input.productId } }
  }
  if (input.itemNumber !== undefined) data.itemNumber = input.itemNumber
  if (input.dyeLot !== undefined) data.dyeLot = input.dyeLot
  if (input.warehouseId !== undefined) {
    data.warehouse = { connect: { id: input.warehouseId } }
  }
  if (input.locationId !== undefined) {
    data.location = input.locationId
      ? { connect: { id: input.locationId } }
      : { disconnect: true }
  }
  if (input.startingStock !== undefined) data.startingStock = input.startingStock
  if (input.cost !== undefined) data.cost = input.cost
  if (input.freight !== undefined) data.freight = input.freight
  if (input.notes !== undefined) data.notes = input.notes
  if (input.isImported !== undefined) data.isImported = input.isImported
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

// --- Diff-save primitive ---

/**
 * Diff-save primitive for the imports record-view's staged-rows section.
 *
 * Caller contract (application layer):
 *  - Opens the transaction via `withDatabaseTransaction` and locks the parent
 *    import row FOR UPDATE before invoking.
 *  - Validated the diff via `validateStagedInventoryRowsDiff` (domain) — shape,
 *    warehouse matches, locked rows aren't edited, etc.
 *  - Pre-assigned UUIDs to added drafts via the domain helper
 *    `assignStagedInventoryDiffIds` and passes them as `id` on each added entry.
 *
 * Execution order:
 *  1. deleteMany(deleted.ids)
 *  2. Build tempIdMap from added (pure, no round-trips)
 *  3. createMany(added) using pre-assigned ids
 *  4. Per-row update for each modified entry (heterogeneous patches)
 *  5. Reload post-state via listStagedInventoryByImport(importEntryId, tx)
 *  6. Return { rows, tempIdMap }
 */
export type ApplyStagedInventoryRowsDiffInput = {
  importEntryId: string
  added: Array<{
    id: string
    tempId: string
    productId: string
    itemNumber: string
    dyeLot: string | null
    warehouseId: string
    locationId: string | null
    startingStock: string
    cost: string | null
    freight: string | null
    notes: string | null
  }>
  modified: Array<{
    id: string
    patch: UpdateStagedInventoryRecordInput
  }>
  deleted: Array<{ id: string }>
}

export type ApplyStagedInventoryRowsDiffResult = {
  rows: StagedInventoryRecord[]
  tempIdMap: Record<string, string>
}

export async function applyStagedInventoryRowsDiff(
  tx: Prisma.TransactionClient,
  input: ApplyStagedInventoryRowsDiffInput,
): Promise<ApplyStagedInventoryRowsDiffResult> {
  // Step 1 — batch delete
  if (input.deleted.length > 0) {
    await tx.flooringImportStagedInventoryRow.deleteMany({
      where: { id: { in: input.deleted.map((d) => d.id) } },
    })
  }

  // Step 2 — tempIdMap from added (pure)
  const tempIdMap: Record<string, string> = {}
  for (const draft of input.added) {
    tempIdMap[draft.tempId] = draft.id
  }

  // Step 3 — batch create with pre-assigned ids
  if (input.added.length > 0) {
    await tx.flooringImportStagedInventoryRow.createMany({
      data: input.added.map((draft) => ({
        id: draft.id,
        importEntryId: input.importEntryId,
        productId: draft.productId,
        itemNumber: draft.itemNumber,
        dyeLot: draft.dyeLot,
        warehouseId: draft.warehouseId,
        locationId: draft.locationId,
        startingStock: draft.startingStock,
        cost: draft.cost,
        freight: draft.freight,
        notes: draft.notes,
      })),
    })
  }

  // Step 4 — per-row updates (patches are heterogeneous)
  for (const modification of input.modified) {
    const data = buildUpdateData(modification.patch)
    if (Object.keys(data).length === 0) continue
    await tx.flooringImportStagedInventoryRow.update({
      where: { id: modification.id },
      data,
    })
  }

  // Step 5 — reload post-state
  const rows = await listStagedInventoryByImport(input.importEntryId, tx)

  return { rows, tempIdMap }
}

// --- Mark-for-import primitive ---

/**
 * Transactional primitive: flips a batch of staged rows from
 * (status="DRAFT", isImported=false) to (status="QUEUED", isImported=true).
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
      isImported: false,
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
        isImported: false,
      },
      data: { status: "QUEUED", isImported: true },
    })
  }

  // Step 3 — derive split.
  const markedRowIds = Array.from(eligibleIds)
  const skippedRowIds = input.stagedRowIds.filter((id) => !eligibleIds.has(id))
  return { markedRowIds, skippedRowIds }
}
