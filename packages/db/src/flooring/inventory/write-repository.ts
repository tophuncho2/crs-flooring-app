import { Prisma } from "../../generated/prisma/client.js"
import type { PaletteColor } from "@builders/domain"
import { db } from "../../client.js"
import { type InventoryDbClient } from "./shared.js"
import { getInventoryById, type InventoryRecord } from "./read-repository.js"

/**
 * Acquire a row-level lock on a single inventory row for the duration of the
 * caller's transaction. Mirrors `lockInventoryForAdjustment` in
 * `packages/db/src/flooring/inventory/adjustments/locks.ts` — same SQL
 * pattern, exposed under a non-adjustment-specific name so the inventory
 * update + delete use cases can share the lock primitive.
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
 * `MaterializeStagedRowsToInventoryInput` below. The snapshot columns (the
 * stock + send unit fields) are stamped at materialize time from the linked
 * product and are immutable post-create.
 */
export type MaterializeInventoryRowFields = {
  importEntryId: string | null
  productId: string
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  sendUnitName: string | null
  sendUnitAbbrev: string | null
  /**
   * Display prefix for the roll number (column default `'ROLL#'`). Worker
   * materialize copies it verbatim from the source staged row so the
   * inventory row inherits the same prefix.
   */
  rollPrefix: string
  rollNumber: string | null
  dyeLot: string | null
  note: string | null
  internalNotes: string | null
  warehouseId: string
  location: string | null
  startingStock: Prisma.Decimal | string | number
  cost: Prisma.Decimal | string | number | null
  freight: Prisma.Decimal | string | number | null
  /** Actor email of the user who marked the rows for import — stamped into both createdBy + updatedBy. */
  createdBy: string
  updatedBy: string
}

/**
 * Update input — editable subset only. Mirrors domain.editability
 * INVENTORY_EDITABLE_FIELDS. The warehouse FK and the identity columns
 * (rollNumber, dyeLot, note) are not in this shape — `warehouseId` is
 * set-on-insert by the materialize worker and identity columns are
 * set-on-create only; none are ever patched afterward.
 */
export type UpdateInventoryRecordInput = {
  location?: string | null
  internalNotes?: string | null
  isArchived?: boolean
  /** Non-semantic palette tag. Metadata only — never triggers a recompute. */
  color?: PaletteColor
  /** Actor email of the editing user — stamped on every human edit. */
  updatedBy: string
}

/**
 * Transactional helper — only called inside adjustment write transactions
 * so the `netDeducted` running total stays in sync with the adjustment
 * rows. Regular user / worker code should never touch this directly.
 */
export type UpdateInventoryNetDeductedInput = {
  netDeducted: Prisma.Decimal | string | number
}

function buildUpdateData(
  input: UpdateInventoryRecordInput,
): Prisma.FlooringInventoryUpdateInput {
  const data: Prisma.FlooringInventoryUpdateInput = {}
  if (input.location !== undefined) data.location = input.location
  if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes
  if (input.isArchived !== undefined) data.isArchived = input.isArchived
  if (input.color !== undefined) data.color = input.color
  // A human save always records its editor (mirrors the warehouse actor pattern).
  data.updatedBy = input.updatedBy
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
 * Adjusts the inventory row's `netDeducted` atomically. Called by adjustment
 * application use cases inside the same transaction as the adjustment
 * mutation. Currently has no direct callers — the recompute primitive
 * (`recomputeAndPersistNetDeducted`) issues the update inline.
 */
export async function updateInventoryNetDeducted(
  id: string,
  input: UpdateInventoryNetDeductedInput,
  client: InventoryDbClient = db,
): Promise<InventoryRecord> {
  await client.flooringInventory.update({
    where: { id },
    data: { netDeducted: input.netDeducted },
    select: { id: true },
  })
  const record = await getInventoryById(id, client)
  if (!record) {
    throw new Error(`updateInventoryNetDeducted: inventory ${id} not found after update`)
  }
  return record
}

export async function deleteInventoryRecordById(
  id: string,
  client: InventoryDbClient = db,
): Promise<void> {
  await client.flooringInventory.delete({ where: { id } })
}

// --- Single-row insert primitive (inventory duplicate) ---

/**
 * Scalar column set for inserting a single inventory row directly (the
 * "duplicate inventory item" use case — the only non-worker construction
 * path). Excludes the DB-managed columns: `id`, `inventoryNumber` /
 * `inventoryNumberInt` (sequence/computed) and `updatedAt`. `createdAt` is optional: omitted, it falls to
 * the DB `@default(now())` (the duplicate path); supplied, the caller can pin
 * it (the manual-create path stamps `createdAt` to the creation instant). The
 * caller pastes the snapshot columns and drops import provenance to null.
 */
export type InsertInventoryRowInput = {
  importEntryId: string | null
  sourceStagedRowId: string | null
  productId: string
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  sendUnitName: string | null
  sendUnitAbbrev: string | null
  rollPrefix: string
  rollNumber: string | null
  dyeLot: string | null
  note: string | null
  internalNotes: string | null
  warehouseId: string
  location: string | null
  startingStock: Prisma.Decimal | string | number
  cost: Prisma.Decimal | string | number | null
  freight: Prisma.Decimal | string | number | null
  netDeducted: Prisma.Decimal | string | number
  isArchived: boolean
  createdAt?: Date
  /** Actor email of the creating user — stamped into both createdBy + updatedBy. */
  createdBy: string
  updatedBy: string
}

/**
 * Insert a single inventory row and return the normalized record. The caller
 * must provide a transaction client.
 */
export async function insertInventoryRow(
  tx: Prisma.TransactionClient,
  input: InsertInventoryRowInput,
): Promise<InventoryRecord> {
  const created = await tx.flooringInventory.create({
    data: {
      importEntryId: input.importEntryId,
      sourceStagedRowId: input.sourceStagedRowId,
      productId: input.productId,
      stockUnitName: input.stockUnitName,
      stockUnitAbbrev: input.stockUnitAbbrev,
      sendUnitName: input.sendUnitName,
      sendUnitAbbrev: input.sendUnitAbbrev,
      rollPrefix: input.rollPrefix,
      rollNumber: input.rollNumber,
      dyeLot: input.dyeLot,
      note: input.note,
      internalNotes: input.internalNotes,
      warehouseId: input.warehouseId,
      location: input.location,
      startingStock: input.startingStock,
      cost: input.cost,
      freight: input.freight,
      netDeducted: input.netDeducted,
      isArchived: input.isArchived,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
    },
    select: { id: true },
  })

  const record = await getInventoryById(created.id, tx)
  if (!record) {
    throw new Error(`insertInventoryRow: inventory ${created.id} not found after insert`)
  }
  return record
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
 *  - Caller computed every per-row field (unit
 *    snapshots, etc.) — this primitive
 *    does no field math. `createdAt` is DB-defaulted (`@default(now())`).
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
      sourceStagedRowId: row.sourceStagedRowId,
      importEntryId: row.importEntryId,
      productId: row.productId,
      stockUnitName: row.stockUnitName,
      stockUnitAbbrev: row.stockUnitAbbrev,
      sendUnitName: row.sendUnitName,
      sendUnitAbbrev: row.sendUnitAbbrev,
      rollPrefix: row.rollPrefix,
      rollNumber: row.rollNumber,
      dyeLot: row.dyeLot,
      note: row.note,
      internalNotes: row.internalNotes,
      warehouseId: row.warehouseId,
      location: row.location,
      startingStock: row.startingStock,
      cost: row.cost,
      freight: row.freight,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
    }),
  )
  await tx.flooringInventory.createMany({ data: createData, skipDuplicates: false })

  // Step 2 — re-read the created rows to surface DB-assigned inventoryNumbers
  // for the return value.
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
