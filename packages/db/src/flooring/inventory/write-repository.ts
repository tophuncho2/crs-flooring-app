import { Prisma } from "../../generated/prisma/client.js"
import { composeInventoryItem } from "@builders/domain"
import { db } from "../../client.js"
import { type InventoryDbClient } from "./shared.js"
import { getInventoryById, type InventoryRecord } from "./read-repository.js"

/**
 * Acquire a row-level lock on a single inventory row for the duration of the
 * caller's transaction. Mirrors `lockInventoryForCutLog` in
 * `packages/db/src/flooring/work-orders/cut-logs/write-repository.ts` — same
 * SQL pattern, exposed under a non-cut-log-specific name so the inventory
 * update + delete use cases can share the lock primitive without the cut-log
 * naming smell.
 *
 * Concurrent updates against the same inventory id serialize on this lock;
 * concurrent updates against different inventory ids run in parallel.
 */
export async function lockInventoryRow(
  tx: Prisma.TransactionClient,
  inventoryId: string,
): Promise<void> {
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "flooring_inventory" WHERE "id" = ${inventoryId} FOR UPDATE`,
  )
}

/**
 * Worker-only field set for a real inventory row. Inventory rows are not
 * user-creatable — the materialize import worker is the sole construction
 * path, consumed exclusively via `materializeStagedRowsToInventory` and
 * `MaterializeStagedRowsToInventoryInput` below. The snapshot columns
 * (`productName`, `categoryName`, `categorySlug`, the 6 unit fields,
 * `importNumber`, `purchaseOrderNumber`, `inventoryItem`) are stamped at
 * materialize time from the linked product + import entry and are
 * immutable post-create; product-level locks
 * (`isProductCategoryChangeBlocked`, `isProductCoveragePerUnitChangeBlocked`)
 * keep the joined source consistent with the snapshots for the lifetime of
 * the inventory row.
 */
export type MaterializeInventoryRowFields = {
  importEntryId: string | null
  importNumber: string | null
  purchaseOrderNumber: string | null
  productId: string
  productName: string
  categorySlug: string
  categoryName: string
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  itemCoverageUnitName: string | null
  itemCoverageUnitAbbrev: string | null
  sendUnitName: string | null
  sendUnitAbbrev: string | null
  /**
   * Display prefix for the roll number (column default `'ROLL#'`). Worker
   * materialize copies it verbatim from the source staged row so the
   * inventory row inherits the same prefix. Read by `composeInventoryItem`
   * when building the `inventoryItem` denorm column.
   */
  rollPrefix: string
  rollNumber: string | null
  dyeLot: string | null
  note: string | null
  internalNotes: string | null
  inventoryItem: string
  warehouseId: string
  location: string | null
  startingStock: Prisma.Decimal | string | number
  coveragePerUnit: Prisma.Decimal | string | number | null
  fifoReceivedAt: Date
}

/**
 * Update input — editable subset only. Mirrors domain.editability
 * INVENTORY_EDITABLE_FIELDS plus `inventoryItem` (server-recomputed by the
 * application's update use case via `composeInventoryItem` in the same
 * transaction whenever a source field — rollNumber, dyeLot, location,
 * note — changes). Snapshot columns (productName, categoryName,
 * importNumber, purchaseOrderNumber) and the warehouse FK are not in this
 * shape — `warehouseId` is set-on-insert by the materialize worker and
 * never patched afterward.
 */
export type UpdateInventoryRecordInput = {
  rollNumber?: string | null
  dyeLot?: string | null
  location?: string | null
  note?: string | null
  internalNotes?: string | null
  inventoryItem?: string
  isArchived?: boolean
}

/**
 * Transactional helper — only called inside cut-log write transactions so the
 * `totalCutSum` running total stays in sync with the cut-log rows. Regular
 * user / worker code should never touch this directly.
 */
export type UpdateInventoryTotalCutSumInput = {
  totalCutSum: Prisma.Decimal | string | number
}

function buildUpdateData(
  input: UpdateInventoryRecordInput,
): Prisma.FlooringInventoryUpdateInput {
  const data: Prisma.FlooringInventoryUpdateInput = {}
  if (input.rollNumber !== undefined) data.rollNumber = input.rollNumber
  if (input.dyeLot !== undefined) data.dyeLot = input.dyeLot
  if (input.location !== undefined) data.location = input.location
  if (input.note !== undefined) data.note = input.note
  if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes
  if (input.inventoryItem !== undefined) data.inventoryItem = input.inventoryItem
  if (input.isArchived !== undefined) data.isArchived = input.isArchived
  return data
}

export async function updateInventoryRecord(
  id: string,
  input: UpdateInventoryRecordInput,
  client: InventoryDbClient = db,
): Promise<InventoryRecord> {
  const data = buildUpdateData(input)
  if (Object.keys(data).length > 0) {
    await client.flooringInventory.update({
      where: { id },
      data,
      select: { id: true },
    })
  }
  const record = await getInventoryById(id, client)
  if (!record) throw new Error(`updateInventoryRecord: inventory ${id} not found after update`)
  return record
}

/**
 * Adjusts the inventory row's totalCutSum atomically. Called by cut-log
 * application use cases (a future sweep) inside the same transaction as the
 * cut-log mutation. Currently has no callers; reserved for the cut-log
 * application layer.
 */
export async function updateInventoryTotalCutSum(
  id: string,
  input: UpdateInventoryTotalCutSumInput,
  client: InventoryDbClient = db,
): Promise<InventoryRecord> {
  await client.flooringInventory.update({
    where: { id },
    data: { totalCutSum: input.totalCutSum },
    select: { id: true },
  })
  const record = await getInventoryById(id, client)
  if (!record) {
    throw new Error(`updateInventoryTotalCutSum: inventory ${id} not found after update`)
  }
  return record
}

export async function deleteInventoryRecordById(
  id: string,
  client: InventoryDbClient = db,
): Promise<void> {
  await client.flooringInventory.delete({ where: { id } })
}

// --- Worker materialization primitive ---

/**
 * Transactional primitive: bulk-creates `flooring_inventory` rows from a set
 * of QUEUED staged rows and atomically flips those staged rows to IMPORTED.
 *
 * Caller contract (application / worker):
 *  - Caller pre-assigns a UUID `id` for every `inventoryRowsToCreate` entry
 *    (mirrors `applyStagedInventoryRowsDiff`'s pre-assigned-id pattern;
 *    necessary because Prisma's `createMany` does not return inserted IDs on
 *    Postgres). Pre-assignment also lets the caller correlate inserts with
 *    their source staged rows for the secondary `updateMany`.
 *  - Caller computed every per-row field (productName, categoryName, unit
 *    snapshots, importNumber, purchaseOrderNumber, inventoryItem,
 *    fifoReceivedAt, etc.) — this primitive does no field math. Coverage-rule
 *    branching belongs in the application layer via
 *    `categorySupportsCoverageComputation`.
 *  - Caller has already transitioned the source staged rows from DRAFT to
 *    QUEUED via `markStagedRowsForImport`. The status-flip below targets
 *    QUEUED → IMPORTED defensively (rows in any other state are skipped by
 *    the WHERE clause).
 *  - `inventoryNumber` is sequence-defaulted at the DB level. The primitive
 *    re-reads the inserted rows to surface the assigned numbers — the worker
 *    needs them for the outbox event that completes the import flow.
 *
 * Atomicity: insert + status-flip share the transaction. A partial application
 * leaves the system inconsistent with no easy reconciliation, so `tx` is
 * required (no `client = db` default).
 */
export type MaterializeStagedRowsToInventoryInput = {
  importEntryId: string
  inventoryRowsToCreate: Array<
    MaterializeInventoryRowFields & { id: string; sourceStagedRowId: string }
  >
}

export type MaterializeStagedRowsToInventoryResult = {
  created: Array<{ id: string; inventoryNumber: string }>
  materializedStagedRowIds: string[]
}

export async function materializeStagedRowsToInventory(
  tx: Prisma.TransactionClient,
  input: MaterializeStagedRowsToInventoryInput,
): Promise<MaterializeStagedRowsToInventoryResult> {
  if (input.inventoryRowsToCreate.length === 0) {
    return { created: [], materializedStagedRowIds: [] }
  }

  // Step 1 — bulk insert with pre-assigned ids. Prisma's createMany ignores
  // relation-style nested writes, so we flatten to scalar fk columns directly.
  const createData: Prisma.FlooringInventoryCreateManyInput[] = input.inventoryRowsToCreate.map(
    (row) => ({
      id: row.id,
      importEntryId: row.importEntryId,
      importNumber: row.importNumber,
      purchaseOrderNumber: row.purchaseOrderNumber,
      productId: row.productId,
      productName: row.productName,
      categorySlug: row.categorySlug,
      categoryName: row.categoryName,
      stockUnitName: row.stockUnitName,
      stockUnitAbbrev: row.stockUnitAbbrev,
      itemCoverageUnitName: row.itemCoverageUnitName,
      itemCoverageUnitAbbrev: row.itemCoverageUnitAbbrev,
      sendUnitName: row.sendUnitName,
      sendUnitAbbrev: row.sendUnitAbbrev,
      rollPrefix: row.rollPrefix,
      rollNumber: row.rollNumber,
      dyeLot: row.dyeLot,
      note: row.note,
      internalNotes: row.internalNotes,
      inventoryItem: row.inventoryItem,
      warehouseId: row.warehouseId,
      location: row.location,
      startingStock: row.startingStock,
      coveragePerUnit: row.coveragePerUnit,
      fifoReceivedAt: row.fifoReceivedAt,
    }),
  )
  await tx.flooringInventory.createMany({ data: createData, skipDuplicates: false })

  // Step 2 — re-read the created rows to surface DB-assigned inventoryNumbers.
  const createdIds = input.inventoryRowsToCreate.map((row) => row.id)
  const createdRows = await tx.flooringInventory.findMany({
    where: { id: { in: createdIds } },
    select: { id: true, inventoryNumber: true },
  })

  // Step 2.5 — compose `inventoryItem` per row now that inventoryNumber is
  // sequence-assigned. The composer is a pure domain helper (carve-out per
  // packages/db/CLAUDE.md). Caller wrote `""` as a placeholder during the
  // bulk insert; we update each row in-place. Single materialization path =
  // single composition path; no other inventory-create surface exists.
  const inputById = new Map(input.inventoryRowsToCreate.map((row) => [row.id, row]))
  for (const created of createdRows) {
    const source = inputById.get(created.id)
    if (!source) continue
    const inventoryItem = composeInventoryItem({
      inventoryNumber: created.inventoryNumber,
      rollPrefix: source.rollPrefix,
      rollNumber: source.rollNumber ?? "",
      dyeLot: source.dyeLot ?? "",
      note: source.note ?? "",
    })
    await tx.flooringInventory.update({
      where: { id: created.id },
      data: { inventoryItem },
      select: { id: true },
    })
  }

  // Step 3 — flip the source staged rows to IMPORTED. WHERE narrows to QUEUED
  // so any row that drifted state is left alone (caller error, surfaces as a
  // skipped row in the result).
  const sourceStagedRowIds = input.inventoryRowsToCreate.map((row) => row.sourceStagedRowId)
  await tx.flooringImportStagedInventoryRow.updateMany({
    where: {
      id: { in: sourceStagedRowIds },
      importEntryId: input.importEntryId,
      status: "QUEUED",
    },
    data: { status: "IMPORTED" },
  })

  return {
    created: createdRows.map((row) => ({ id: row.id, inventoryNumber: row.inventoryNumber })),
    materializedStagedRowIds: sourceStagedRowIds,
  }
}
