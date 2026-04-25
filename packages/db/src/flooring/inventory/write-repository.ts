import type { Prisma } from "@prisma/client"
import { db } from "../../client.js"
import { type InventoryDbClient } from "./shared.js"
import { getInventoryById, type InventoryRecord } from "./read-repository.js"

/**
 * Create input for a real inventory row. Every field is worker-owned — the
 * worker materializes staged rows into real inventory at import time, stamping
 * the snapshot columns (`categorySlug` + the 6 unit fields) and the per-unit
 * cost / freight / coverage values, then picking up the FIFO timestamp. User
 * flows never call this directly.
 *
 * The snapshot fields come from the linked product's category at materialize
 * time and are immutable post-create; product-level locks
 * (`isProductCategoryChangeBlocked`, `isProductCoveragePerUnitChangeBlocked`)
 * keep the joined source consistent with the snapshot for the lifetime of
 * the inventory row.
 */
export type CreateInventoryRecordInput = {
  importEntryId: string | null
  productId: string
  categorySlug: string
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  itemCoverageUnitName: string | null
  itemCoverageUnitAbbrev: string | null
  sendUnitName: string | null
  sendUnitAbbrev: string | null
  itemNumber: string | null
  dyeLot: string | null
  warehouseId: string
  locationId: string | null
  startingStock: Prisma.Decimal | string | number
  cost: Prisma.Decimal | string | number | null
  freight: Prisma.Decimal | string | number | null
  costPerUnit: Prisma.Decimal | string | number | null
  freightPerUnit: Prisma.Decimal | string | number | null
  coveragePerUnit: Prisma.Decimal | string | number | null
  notes: string | null
  fifoReceivedAt: Date
}

/**
 * Update input — editable subset only. Mirrors domain.editability
 * INVENTORY_EDITABLE_FIELDS. Immutable fields (startingStock, cost, freight,
 * cost/freight/coverage-per-unit, importEntryId, productId, categorySlug,
 * fifoReceivedAt) are deliberately absent from this shape.
 */
export type UpdateInventoryRecordInput = {
  itemNumber?: string | null
  dyeLot?: string | null
  warehouseId?: string
  locationId?: string | null
  notes?: string | null
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

function buildCreateData(
  input: CreateInventoryRecordInput,
): Prisma.FlooringInventoryCreateInput {
  const data: Prisma.FlooringInventoryCreateInput = {
    product: { connect: { id: input.productId } },
    warehouse: { connect: { id: input.warehouseId } },
    categorySlug: input.categorySlug,
    stockUnitName: input.stockUnitName,
    stockUnitAbbrev: input.stockUnitAbbrev,
    itemCoverageUnitName: input.itemCoverageUnitName,
    itemCoverageUnitAbbrev: input.itemCoverageUnitAbbrev,
    sendUnitName: input.sendUnitName,
    sendUnitAbbrev: input.sendUnitAbbrev,
    itemNumber: input.itemNumber,
    dyeLot: input.dyeLot,
    startingStock: input.startingStock,
    cost: input.cost,
    freight: input.freight,
    costPerUnit: input.costPerUnit,
    freightPerUnit: input.freightPerUnit,
    coveragePerUnit: input.coveragePerUnit,
    notes: input.notes,
    fifoReceivedAt: input.fifoReceivedAt,
  }
  if (input.locationId) data.location = { connect: { id: input.locationId } }
  if (input.importEntryId) data.importEntry = { connect: { id: input.importEntryId } }
  return data
}

function buildUpdateData(
  input: UpdateInventoryRecordInput,
): Prisma.FlooringInventoryUpdateInput {
  const data: Prisma.FlooringInventoryUpdateInput = {}
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
  if (input.notes !== undefined) data.notes = input.notes
  if (input.isArchived !== undefined) data.isArchived = input.isArchived
  return data
}

export async function createInventoryRecord(
  input: CreateInventoryRecordInput,
  client: InventoryDbClient = db,
): Promise<InventoryRecord> {
  const row = await client.flooringInventory.create({
    data: buildCreateData(input),
    select: { id: true },
  })
  const record = await getInventoryById(row.id, client)
  if (!record) throw new Error("createInventoryRecord: record disappeared mid-transaction")
  return record
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
 *  - Caller computed every per-row field (categorySlug, unit snapshots,
 *    cost/freight per-unit, fifoReceivedAt, etc.) — this primitive does no
 *    field math. Coverage-rule branching belongs in the application layer
 *    via `categorySupportsCoverageComputation`.
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
    CreateInventoryRecordInput & { id: string; sourceStagedRowId: string }
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
      productId: row.productId,
      categorySlug: row.categorySlug,
      stockUnitName: row.stockUnitName,
      stockUnitAbbrev: row.stockUnitAbbrev,
      itemCoverageUnitName: row.itemCoverageUnitName,
      itemCoverageUnitAbbrev: row.itemCoverageUnitAbbrev,
      sendUnitName: row.sendUnitName,
      sendUnitAbbrev: row.sendUnitAbbrev,
      itemNumber: row.itemNumber,
      dyeLot: row.dyeLot,
      warehouseId: row.warehouseId,
      locationId: row.locationId,
      startingStock: row.startingStock,
      cost: row.cost,
      freight: row.freight,
      costPerUnit: row.costPerUnit,
      freightPerUnit: row.freightPerUnit,
      coveragePerUnit: row.coveragePerUnit,
      notes: row.notes,
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
