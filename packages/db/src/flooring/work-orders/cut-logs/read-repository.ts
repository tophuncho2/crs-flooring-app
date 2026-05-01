import { db } from "../../../client.js"
import { normalizeCutLogRow } from "../../inventory/cut-logs/read-repository.js"
import type { CutLogRecord } from "../../inventory/cut-logs/read-repository.js"
import { cutLogRowSelect } from "../../inventory/cut-logs/shared.js"
import type { CutLogParentContext } from "@builders/domain"
import type { Prisma, PrismaClient } from "@prisma/client"

type WorkOrdersDbClient = PrismaClient | Prisma.TransactionClient

const workOrderCutLogSelect = {
  id: true,
  cutLogNumber: true,
  inventoryId: true,
  workOrderId: true,
  workOrderItemId: true,
  before: true,
  cut: true,
  coverageCut: true,
  after: true,
  stockUnitName: true,
  stockUnitAbbrev: true,
  itemCoverageUnitName: true,
  itemCoverageUnitAbbrev: true,
  status: true,
  isFinal: true,
  finalCutSequence: true,
  isWaste: true,
  void: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const

export type WorkOrderCutLogRowPayload = Prisma.FlooringCutLogGetPayload<{
  select: typeof workOrderCutLogSelect
}>

export async function listCutLogsForWorkOrderItem(
  workOrderItemId: string,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderCutLogRowPayload[]> {
  return client.flooringCutLog.findMany({
    where: { workOrderItemId },
    select: workOrderCutLogSelect,
    orderBy: [
      { isFinal: "asc" },
      { finalCutSequence: "asc" },
      { createdAt: "asc" },
    ],
  })
}

/**
 * Bulk variant of `listCutLogsForWorkOrderItem` — returns the flat row
 * set across many WOMI ids in one query, ordered identically. The SSR
 * loader for the WO record page calls this once and groups client-side
 * so every expandable cut-log row hydrates from initial data.
 */
export async function listCutLogsForWorkOrderItemIds(
  workOrderItemIds: string[],
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderCutLogRowPayload[]> {
  if (workOrderItemIds.length === 0) return []
  return client.flooringCutLog.findMany({
    where: { workOrderItemId: { in: workOrderItemIds } },
    select: workOrderCutLogSelect,
    orderBy: [
      { isFinal: "asc" },
      { finalCutSequence: "asc" },
      { createdAt: "asc" },
    ],
  })
}

/**
 * Returns the union of inventory ids touched by a pending-cut-log diff:
 *  - Every draft's `inventoryId` (drafts target the inventory directly).
 *  - The `inventoryId` of every existing cut log referenced by an update
 *    or delete (looked up by id).
 *
 * The application layer hands this set to `lockInventoriesForCutLogBatch`
 * for deterministic FOR UPDATE locking before applying the diff.
 */
export async function getInventoriesForCutLogDiff(
  diff: {
    drafts: Array<{ inventoryId: string }>
    updates: Array<{ id: string }>
    deletes: Array<{ id: string }>
  },
  client: WorkOrdersDbClient = db,
): Promise<string[]> {
  const fromDrafts = diff.drafts.map((d) => d.inventoryId)
  const referencedIds = [...diff.updates.map((u) => u.id), ...diff.deletes.map((d) => d.id)]

  if (referencedIds.length === 0) {
    return Array.from(new Set(fromDrafts))
  }

  const rows = await client.flooringCutLog.findMany({
    where: { id: { in: referencedIds } },
    select: { inventoryId: true },
  })

  return Array.from(new Set([...fromDrafts, ...rows.map((r) => r.inventoryId)]))
}

/**
 * Returns the inventory ids touched by the cut-log set referenced for a
 * finalize-batch operation. Worker hands the resulting set to
 * `lockInventoriesForCutLogBatch`.
 */
export async function getInventoriesForCutLogIds(
  cutLogIds: string[],
  client: WorkOrdersDbClient = db,
): Promise<string[]> {
  if (cutLogIds.length === 0) return []
  const rows = await client.flooringCutLog.findMany({
    where: { id: { in: cutLogIds } },
    select: { inventoryId: true },
  })
  return Array.from(new Set(rows.map((r) => r.inventoryId)))
}

/**
 * Reads the projected post-diff cut-log rows that
 * `computeTotalCutSum` operates on. Used by the worker after applying
 * the diff to recompute each touched inventory's totalCutSum.
 */
export async function listCutLogsForInventoryIds(
  inventoryIds: string[],
  client: WorkOrdersDbClient = db,
): Promise<Array<{ inventoryId: string; cut: string; void: boolean }>> {
  if (inventoryIds.length === 0) return []
  const rows = await client.flooringCutLog.findMany({
    where: { inventoryId: { in: inventoryIds } },
    select: { inventoryId: true, cut: true, void: true },
  })
  return rows.map((r) => ({
    inventoryId: r.inventoryId,
    cut: r.cut.toString(),
    void: r.void,
  }))
}

export type PendingCutLogWithInventoryForMutation = {
  cutLog: CutLogRecord
  inventory: CutLogParentContext
}

/**
 * Single-query read powering the per-row update + delete sync use cases.
 * Returns the cut log (full normalized record) plus the parent
 * inventory's `CutLogParentContext` shape — the use case asserts WOMI
 * linkage / pending-status / OCC against the cut log, then locks the
 * inventory row FOR UPDATE and applies the patch.
 *
 * Caller is the WO-side application use case; transaction client is
 * required (no `db` default) so the read participates in the same TX
 * that takes the lock.
 */
export async function getPendingCutLogWithInventoryForMutation(
  tx: Prisma.TransactionClient,
  cutLogId: string,
): Promise<PendingCutLogWithInventoryForMutation | null> {
  const row = await tx.flooringCutLog.findUnique({
    where: { id: cutLogId },
    select: {
      ...cutLogRowSelect,
      inventory: {
        select: {
          id: true,
          startingStock: true,
          totalCutSum: true,
          coveragePerUnit: true,
          categorySlug: true,
          stockUnitName: true,
          stockUnitAbbrev: true,
          itemCoverageUnitName: true,
          itemCoverageUnitAbbrev: true,
        },
      },
    },
  })
  if (!row) return null
  const { inventory: inv, ...cutLogPayload } = row
  return {
    cutLog: normalizeCutLogRow(cutLogPayload),
    inventory: {
      inventoryId: inv.id,
      startingStock: inv.startingStock.toString(),
      currentTotalCutSum: inv.totalCutSum.toString(),
      coveragePerUnit:
        inv.coveragePerUnit === null ? null : inv.coveragePerUnit.toString(),
      categorySlug: inv.categorySlug,
      stockUnitName: inv.stockUnitName ?? null,
      stockUnitAbbrev: inv.stockUnitAbbrev ?? null,
      itemCoverageUnitName: inv.itemCoverageUnitName ?? null,
      itemCoverageUnitAbbrev: inv.itemCoverageUnitAbbrev ?? null,
    },
  }
}
