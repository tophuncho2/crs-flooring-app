import type { Prisma } from "@prisma/client"
import type {
  CutLogParentContext,
  CutLogRow,
  CutLogStatus,
  DiffExistingCutLogRow,
} from "@builders/domain"
import { db } from "../../../client.js"
import {
  cutLogRowSelect,
  type CutLogDbClient,
  type CutLogRowPayload,
} from "./shared.js"

export type CutLogRecord = CutLogRow

function toDecimalString(value: { toString(): string }): string {
  return value.toString()
}

function toDecimalStringOrNull(
  value: { toString(): string } | null | undefined,
): string | null {
  if (value === null || value === undefined) return null
  return value.toString()
}

/**
 * Normalize a cut-log payload into the domain read shape. The domain
 * `CutLogRow` (sweep 2) keeps `coverageCut` / `cost` / `freight` as
 * `string | null`, so the normalizer preserves null instead of coercing
 * to `""`. The three sweep-1 fields (`cutLogNumber`, `finalCutSequence`,
 * `isFinal`) are surfaced verbatim.
 */
export function normalizeCutLogRow(row: CutLogRowPayload): CutLogRecord {
  const status: CutLogStatus = row.status
  return {
    id: row.id,
    cutLogNumber: row.cutLogNumber,
    inventoryId: row.inventoryId,
    workOrderId: row.workOrderId ?? null,
    workOrderItemId: row.workOrderItemId ?? null,
    before: toDecimalStringOrNull(row.before),
    cut: toDecimalString(row.cut),
    after: toDecimalStringOrNull(row.after),
    coverageCut: toDecimalStringOrNull(row.coverageCut),
    status,
    isFinal: row.isFinal,
    finalCutSequence: row.finalCutSequence,
    isWaste: row.isWaste,
    void: row.void,
    cost: toDecimalStringOrNull(row.cost),
    freight: toDecimalStringOrNull(row.freight),
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function getCutLogById(
  id: string,
  client: CutLogDbClient = db,
): Promise<CutLogRecord | null> {
  const row = await client.flooringCutLog.findUnique({
    where: { id },
    select: cutLogRowSelect,
  })
  return row ? normalizeCutLogRow(row) : null
}

export async function listCutLogsByInventoryId(
  inventoryId: string,
  client: CutLogDbClient = db,
): Promise<CutLogRecord[]> {
  const rows = await client.flooringCutLog.findMany({
    where: { inventoryId },
    select: cutLogRowSelect,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
  return rows.map(normalizeCutLogRow)
}

// ---------------------------------------------------------------------------
// Worker-only read primitives (transaction-only — no `client = db` default)
// ---------------------------------------------------------------------------

/**
 * Returns the minimal-shape rows that the domain validator
 * `validateCutLogsDiff` needs (id, cut, status, isFinal, void, updatedAt).
 * Caller is the pending-save worker, which feeds this snapshot to
 * `validateCutLogsDiff` under the per-inventory FOR UPDATE lock.
 *
 * Returns ALL cut logs for the inventory (the diff validator decides which
 * rows are touched by the diff).
 */
export async function listCutLogsForPendingSaveDiff(
  tx: Prisma.TransactionClient,
  inventoryId: string,
): Promise<DiffExistingCutLogRow[]> {
  const rows = await tx.flooringCutLog.findMany({
    where: { inventoryId },
    select: {
      id: true,
      cut: true,
      status: true,
      isFinal: true,
      void: true,
      updatedAt: true,
    },
  })
  return rows.map((row) => ({
    id: row.id,
    cut: row.cut.toString(),
    status: row.status,
    isFinal: row.isFinal,
    void: row.void,
    updatedAt: row.updatedAt.toISOString(),
  }))
}

/**
 * Returns the minimal-shape rows needed by `validateCutLogFinalizeBatch`
 * (id, status, isFinal, void, cut). Caller is the finalize worker, which
 * feeds this snapshot to the validator under the per-inventory FOR UPDATE
 * lock.
 */
export async function listCutLogsForFinalizeBatch(
  tx: Prisma.TransactionClient,
  input: { inventoryId: string; cutLogIds: string[] },
): Promise<
  Array<{
    id: string
    status: CutLogStatus
    isFinal: boolean
    void: boolean
    cut: string
  }>
> {
  if (input.cutLogIds.length === 0) return []
  const rows = await tx.flooringCutLog.findMany({
    where: {
      id: { in: input.cutLogIds },
      inventoryId: input.inventoryId,
    },
    select: {
      id: true,
      status: true,
      isFinal: true,
      void: true,
      cut: true,
    },
  })
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    isFinal: row.isFinal,
    void: row.void,
    cut: row.cut.toString(),
  }))
}

/**
 * Single-row read for the void worker. Returns the minimal shape
 * `validateCutLogVoidRequest` needs.
 */
export async function getCutLogForVoid(
  tx: Prisma.TransactionClient,
  cutLogId: string,
): Promise<{
  id: string
  status: CutLogStatus
  isFinal: boolean
  void: boolean
} | null> {
  const row = await tx.flooringCutLog.findUnique({
    where: { id: cutLogId },
    select: {
      id: true,
      status: true,
      isFinal: true,
      void: true,
    },
  })
  return row
    ? {
        id: row.id,
        status: row.status,
        isFinal: row.isFinal,
        void: row.void,
      }
    : null
}

/**
 * Returns full normalized records for the cut logs being finalized — the
 * worker needs the full shape (`cut` value especially) to compute
 * `before` / `after` per row.
 *
 * Ordered by `cutLogNumber ASC`, the visible identifier the user sees in
 * the UI. `cutLogNumber` is a global sequence with a unique constraint
 * (per sweep 1), so this single-key sort is fully deterministic — no
 * tiebreaker needed. The finalize worker's per-row sequence allocation
 * follows the same order so that user-facing IDs and `finalCutSequence`
 * land in lockstep.
 */
export async function getCutLogsForFinalize(
  tx: Prisma.TransactionClient,
  input: { inventoryId: string; cutLogIds: string[] },
): Promise<CutLogRecord[]> {
  if (input.cutLogIds.length === 0) return []
  const rows = await tx.flooringCutLog.findMany({
    where: {
      id: { in: input.cutLogIds },
      inventoryId: input.inventoryId,
    },
    select: cutLogRowSelect,
    orderBy: { cutLogNumber: "asc" },
  })
  return rows.map(normalizeCutLogRow)
}

/**
 * Returns the parent inventory context the diff validator
 * (`validateCutLogsDiff`) AND the worker's `coverageCut` recompute path
 * need: starting stock + current totalCutSum + coveragePerUnit +
 * categorySlug. Caller has already locked the inventory FOR UPDATE.
 *
 * `coveragePerUnit` is `Decimal?` on the schema, surfaced as
 * `string | null` here. `categorySlug` is non-nullable on the schema.
 */
export async function getInventoryParentContextForCutLogs(
  tx: Prisma.TransactionClient,
  inventoryId: string,
): Promise<CutLogParentContext | null> {
  const row = await tx.flooringInventory.findUnique({
    where: { id: inventoryId },
    select: {
      id: true,
      startingStock: true,
      totalCutSum: true,
      coveragePerUnit: true,
      categorySlug: true,
    },
  })
  if (!row) return null
  return {
    inventoryId: row.id,
    startingStock: row.startingStock.toString(),
    currentTotalCutSum: row.totalCutSum.toString(),
    coveragePerUnit:
      row.coveragePerUnit === null ? null : row.coveragePerUnit.toString(),
    categorySlug: row.categorySlug,
  }
}

/**
 * Returns the current `MAX(finalCutSequence)` for an inventory, or null if
 * no rows have been finalized yet on this inventory. The finalize worker
 * feeds the result to `nextFinalCutSequence` (domain pure helper) to
 * allocate per-row ordinals inside the FOR UPDATE lock.
 */
export async function getMaxFinalCutSequenceForInventory(
  tx: Prisma.TransactionClient,
  inventoryId: string,
): Promise<number | null> {
  const result = await tx.flooringCutLog.aggregate({
    where: { inventoryId, isFinal: true },
    _max: { finalCutSequence: true },
  })
  return result._max.finalCutSequence ?? null
}
