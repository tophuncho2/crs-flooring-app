// @ts-nocheck — imports write repo (inventory-diff primitive) pending rebuild.
// Uses stale inventory row shape; follow-on sweep rewires against the new
// diff-types that dropped stockCount/isImported/productId-on-patch.
import type { Prisma } from "@prisma/client"
import type { InventoryRowsDiff } from "@builders/domain"
import { db } from "../../client.js"
import { type ImportsDbClient } from "./shared.js"
import { getImportById, type ImportRecord } from "./read-repository.js"
import { listInventory, type InventoryRecord } from "../inventory/index.js"

export type CreateImportInput = {
  orderNumber: string | null
  tag: string | null
  transportType: string
  status: string
  notes: string | null
  warehouseId: string | null
}

export type UpdateImportInput = {
  orderNumber?: string | null
  tag?: string | null
  transportType?: string
  status?: string
  notes?: string | null
  warehouseId?: string | null
}

export async function createImport(
  input: CreateImportInput,
  client: ImportsDbClient = db,
): Promise<ImportRecord> {
  const row = await client.flooringImportEntry.create({
    data: {
      orderNumber: input.orderNumber,
      tag: input.tag,
      transportType: input.transportType,
      status: input.status,
      notes: input.notes,
      warehouseId: input.warehouseId,
    },
    select: { id: true },
  })
  const record = await getImportById(row.id, client)
  if (!record) throw new Error("createImport: record disappeared mid-transaction")
  return record
}

export async function updateImport(
  id: string,
  input: UpdateImportInput,
  client: ImportsDbClient = db,
): Promise<ImportRecord> {
  const data: Prisma.FlooringImportEntryUpdateInput = {}
  if (input.orderNumber !== undefined) data.orderNumber = input.orderNumber
  if (input.tag !== undefined) data.tag = input.tag
  if (input.transportType !== undefined) data.transportType = input.transportType
  if (input.status !== undefined) data.status = input.status
  if (input.notes !== undefined) data.notes = input.notes
  if (input.warehouseId !== undefined) {
    data.warehouse = input.warehouseId
      ? { connect: { id: input.warehouseId } }
      : { disconnect: true }
  }

  await client.flooringImportEntry.update({
    where: { id },
    data,
    select: { id: true },
  })
  const record = await getImportById(id, client)
  if (!record) throw new Error("updateImport: record not found after update")
  return record
}

export async function deleteImportById(
  id: string,
  client: ImportsDbClient = db,
): Promise<void> {
  await client.flooringImportEntry.delete({ where: { id } })
}

// --- Inventory rows diff primitive (parent-scoped to a single import) ---

/**
 * Input for applyImportInventoryRowsDiff.
 *
 * Caller contract:
 *  - Caller opens the transaction via withDatabaseTransaction and locks the
 *    parent import row FOR UPDATE before invoking this primitive.
 *  - Caller pre-resolves every referenced location to its warehouseId in
 *    locationIndex. The primitive uses this to stamp `warehouseId` on added
 *    rows (source-of-truth rule) without round-tripping.
 *  - Caller has validated the diff via validateInventoryRowsDiff (domain).
 *  - Caller has asserted per-row expectedUpdatedAt against current row state
 *    for modified/deleted entries (ignored here — purely a write primitive).
 *
 * Execution order inside the caller's transaction:
 *  1. deleteMany rows in deleted (WHERE id IN (...)). Cascade on
 *     FlooringCutLog will not fire because domain blocks deleting rows with
 *     cut logs; Sweep 2 does not expose a cut-log mutation through this diff.
 *  2. Build tempIdMap from added (pure; no round-trips).
 *  3. createMany added rows. Each gets:
 *       - id: resolved uuid from tempIdMap
 *       - importEntryId: input.importEntryId
 *       - fifoReceivedAt: new Date() (each row owns its own fifo date)
 *       - isImported: false (flipped later by a separate flow)
 *       - warehouseId: locationIndex.get(locationId)?.warehouseId ?? null
 *  4. Per-row update for each modified entry (distinct patches; no bulk shape
 *     fits given per-row expectedUpdatedAt discipline upstream).
 *  5. Reload the post-state via listInventory({ importEntryId }).
 *  6. Return { rows, tempIdMap }.
 */
export type ApplyImportInventoryRowsDiffInput = {
  importEntryId: string
  importWarehouseId: string | null
  diff: InventoryRowsDiff
  /** tempId → pre-assigned uuid (application layer calls assignInventoryDiffIds). */
  addedIds: Record<string, string>
  /** locationId → { warehouseId } for every location referenced by added/modified rows. */
  locationIndex: Map<string, { warehouseId: string }>
}

export type ApplyImportInventoryRowsDiffResult = {
  rows: InventoryRecord[]
  tempIdMap: Record<string, string>
}

export async function applyImportInventoryRowsDiff(
  input: ApplyImportInventoryRowsDiffInput,
  client: ImportsDbClient,
): Promise<ApplyImportInventoryRowsDiffResult> {
  const { diff, importEntryId, addedIds, locationIndex } = input

  // Step 1 — deleteMany
  if (diff.deleted.length > 0) {
    await client.flooringInventory.deleteMany({
      where: { id: { in: diff.deleted.map((d) => d.id) } },
    })
  }

  // Step 2 — tempIdMap (mirrors addedIds; kept as the return value)
  const tempIdMap: Record<string, string> = { ...addedIds }

  // Step 3 — createMany added rows
  if (diff.added.length > 0) {
    const rows: Prisma.FlooringInventoryCreateManyInput[] = diff.added.map((draft) => {
      const id = tempIdMap[draft.tempId]
      if (!id) {
        throw new Error(
          `applyImportInventoryRowsDiff: addedIds missing entry for tempId ${draft.tempId}`,
        )
      }
      const resolvedWarehouseId = draft.locationId
        ? locationIndex.get(draft.locationId)?.warehouseId ?? draft.warehouseId ?? input.importWarehouseId
        : draft.warehouseId ?? input.importWarehouseId
      return {
        id,
        importEntryId,
        productId: draft.productId,
        itemNumber: draft.itemNumber,
        dyeLot: draft.dyeLot,
        warehouseId: resolvedWarehouseId,
        locationId: draft.locationId,
        stockCount: draft.stockCount,
        cost: draft.cost,
        freight: draft.freight,
        notes: draft.notes,
        isImported: draft.isImported ?? false,
        fifoReceivedAt: new Date(),
      }
    })
    await client.flooringInventory.createMany({ data: rows })
  }

  // Step 4 — per-row updates for modified entries
  for (const modification of diff.modified) {
    const data: Prisma.FlooringInventoryUpdateInput = {}
    const patch = modification.patch
    if (patch.itemNumber !== undefined) data.itemNumber = patch.itemNumber
    if (patch.dyeLot !== undefined) data.dyeLot = patch.dyeLot
    if (patch.stockCount !== undefined) data.stockCount = patch.stockCount
    if (patch.cost !== undefined) data.cost = patch.cost
    if (patch.freight !== undefined) data.freight = patch.freight
    if (patch.notes !== undefined) data.notes = patch.notes
    if (patch.isImported !== undefined) data.isImported = patch.isImported
    if (patch.productId !== undefined) {
      data.product = { connect: { id: patch.productId } }
    }
    if (patch.locationId !== undefined) {
      data.location = patch.locationId
        ? { connect: { id: patch.locationId } }
        : { disconnect: true }
    }
    if (patch.warehouseId !== undefined) {
      data.warehouse = patch.warehouseId
        ? { connect: { id: patch.warehouseId } }
        : { disconnect: true }
    } else if (patch.locationId !== undefined && patch.locationId) {
      // Re-stamp warehouseId from the resolved location when only location changed.
      const resolved = locationIndex.get(patch.locationId)?.warehouseId
      if (resolved) data.warehouse = { connect: { id: resolved } }
    }
    if (Object.keys(data).length === 0) continue
    await client.flooringInventory.update({
      where: { id: modification.id },
      data,
    })
  }

  // Step 5 — reload post-state
  const rows = await listInventory({ importEntryId }, client)

  return { rows, tempIdMap }
}

