import { db } from "../../../client.js"
import { normalizeCutLogRow } from "../../inventory/cut-logs/read-repository.js"
import type { CutLogRecord } from "../../inventory/cut-logs/read-repository.js"
import { cutLogRowSelect } from "../../inventory/cut-logs/shared.js"
import type { CutLogParentContext } from "@builders/domain"
import type { Prisma, PrismaClient } from "@prisma/client"

type WorkOrdersDbClient = PrismaClient | Prisma.TransactionClient

export async function listCutLogsForWorkOrderItem(
  workOrderItemId: string,
  client: WorkOrdersDbClient = db,
): Promise<CutLogRecord[]> {
  const rows = await client.flooringCutLog.findMany({
    where: { workOrderItemId },
    select: cutLogRowSelect,
    orderBy: [
      { isFinal: "asc" },
      { finalCutSequence: "asc" },
      { createdAt: "asc" },
    ],
  })
  return rows.map(normalizeCutLogRow)
}

/**
 * Bulk variant of `listCutLogsForWorkOrderItem` — returns the flat row
 * set across many WOMI ids in one query, ordered identically. The SSR
 * loader for the WO record page calls this once and groups client-side
 * so every expandable cut-log row hydrates from initial data.
 *
 * Returns the canonical normalized `CutLogRecord` shape — the same shape
 * the inventory cut-log section consumes — so a single shared row
 * primitive can render rows in either context.
 */
export async function listCutLogsForWorkOrderItemIds(
  workOrderItemIds: string[],
  client: WorkOrdersDbClient = db,
): Promise<CutLogRecord[]> {
  if (workOrderItemIds.length === 0) return []
  const rows = await client.flooringCutLog.findMany({
    where: { workOrderItemId: { in: workOrderItemIds } },
    select: cutLogRowSelect,
    orderBy: [
      { isFinal: "asc" },
      { finalCutSequence: "asc" },
      { createdAt: "asc" },
    ],
  })
  return rows.map(normalizeCutLogRow)
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
          inventoryNumber: true,
          itemNumber: true,
          dyeLot: true,
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
      inventoryNumber: inv.inventoryNumber,
      itemNumber: inv.itemNumber ?? null,
      dyeLot: inv.dyeLot ?? null,
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
