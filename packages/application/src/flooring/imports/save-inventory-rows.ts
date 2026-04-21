import {
  Prisma,
  applyImportInventoryRowsDiff,
  getImportById,
  getImportDetailById,
  withDatabaseTransaction,
  type ImportsDbClient,
} from "@builders/db"
import {
  assignInventoryDiffIds,
  describeInventoryDiffIssues,
  validateInventoryRowsDiff,
  type DiffExistingInventoryRow,
  type DiffLocationLookup,
  type InventoryRowsDiff,
} from "@builders/domain"
import { ImportExecutionError } from "./errors.js"
import { InventoryExecutionError } from "../inventory/errors.js"
import type { SaveImportInventoryRowsResult } from "./types.js"

type ExistingRowMeta = {
  id: string
  productId: string
  itemNumber: string
  locationId: string | null
  warehouseId: string | null
  isImported: boolean
  updatedAt: Date
  cutLogsCount: number
}

async function loadExistingRows(
  importEntryId: string,
  client: ImportsDbClient,
): Promise<ExistingRowMeta[]> {
  const rows = await client.flooringInventory.findMany({
    where: { importEntryId },
    select: {
      id: true,
      productId: true,
      itemNumber: true,
      locationId: true,
      warehouseId: true,
      isImported: true,
      updatedAt: true,
      _count: { select: { cutLogs: true } },
    },
  })
  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    itemNumber: row.itemNumber,
    locationId: row.locationId,
    warehouseId: row.warehouseId,
    isImported: row.isImported,
    updatedAt: row.updatedAt,
    cutLogsCount: row._count.cutLogs,
  }))
}

function collectReferencedIds(diff: InventoryRowsDiff): {
  productIds: string[]
  locationIds: string[]
} {
  const productIds = new Set<string>()
  const locationIds = new Set<string>()
  for (const draft of diff.added) {
    productIds.add(draft.productId)
    if (draft.locationId) locationIds.add(draft.locationId)
  }
  for (const update of diff.modified) {
    if (update.patch.productId) productIds.add(update.patch.productId)
    if (update.patch.locationId) locationIds.add(update.patch.locationId)
  }
  return {
    productIds: Array.from(productIds),
    locationIds: Array.from(locationIds),
  }
}

async function resolveProducts(
  ids: string[],
  client: ImportsDbClient,
): Promise<Set<string>> {
  if (ids.length === 0) return new Set()
  const rows = await client.flooringProduct.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  })
  return new Set(rows.map((row) => row.id))
}

async function resolveLocations(
  ids: string[],
  client: ImportsDbClient,
): Promise<{ lookups: DiffLocationLookup[]; index: Map<string, { warehouseId: string }> }> {
  if (ids.length === 0) return { lookups: [], index: new Map() }
  const rows = await client.flooringLocation.findMany({
    where: { id: { in: ids } },
    select: { id: true, warehouseId: true },
  })
  const lookups = rows.map((row) => ({ id: row.id, warehouseId: row.warehouseId }))
  const index = new Map(rows.map((row) => [row.id, { warehouseId: row.warehouseId }]))
  return { lookups, index }
}

function toDiffExisting(meta: ExistingRowMeta[]): DiffExistingInventoryRow[] {
  return meta.map((row) => ({
    id: row.id,
    productId: row.productId,
    itemNumber: row.itemNumber,
    locationId: row.locationId,
    warehouseId: row.warehouseId,
    cutLogsCount: row.cutLogsCount,
    isImported: row.isImported,
  }))
}

function assertRowVersions(
  diff: InventoryRowsDiff,
  existing: ExistingRowMeta[],
): void {
  const existingById = new Map(existing.map((row) => [row.id, row]))

  for (const entry of diff.modified) {
    const current = existingById.get(entry.id)
    if (!current) {
      throw new InventoryExecutionError({
        code: "INVENTORY_NOT_FOUND",
        message: `Inventory row ${entry.id} not found on this import.`,
        status: 404,
        payload: { rowId: entry.id },
      })
    }
    if (current.updatedAt.toISOString() !== entry.expectedUpdatedAt) {
      throw new InventoryExecutionError({
        code: "INVENTORY_STALE_ROW_VERSION",
        message: "Inventory row was updated by another request. Refresh and try again.",
        status: 409,
        payload: {
          rowId: entry.id,
          expectedUpdatedAt: entry.expectedUpdatedAt,
          currentUpdatedAt: current.updatedAt.toISOString(),
        },
      })
    }
  }

  for (const entry of diff.deleted) {
    const current = existingById.get(entry.id)
    if (!current) {
      throw new InventoryExecutionError({
        code: "INVENTORY_NOT_FOUND",
        message: `Inventory row ${entry.id} not found on this import.`,
        status: 404,
        payload: { rowId: entry.id },
      })
    }
    if (current.updatedAt.toISOString() !== entry.expectedUpdatedAt) {
      throw new InventoryExecutionError({
        code: "INVENTORY_STALE_ROW_VERSION",
        message: "Inventory row was updated by another request. Refresh and try again.",
        status: 409,
        payload: {
          rowId: entry.id,
          expectedUpdatedAt: entry.expectedUpdatedAt,
          currentUpdatedAt: current.updatedAt.toISOString(),
        },
      })
    }
  }
}

export async function saveImportInventoryRowsUseCase(
  id: string,
  diff: InventoryRowsDiff,
  client?: Prisma.TransactionClient,
): Promise<SaveImportInventoryRowsResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    // Step 1 — lock parent import row for the duration of the transaction.
    await c.$queryRaw(
      Prisma.sql`SELECT "id" FROM "flooring_import_entry" WHERE "id" = ${id} FOR UPDATE`,
    )

    // Step 2 — load parent (no status-based refusal; status is display-only).
    const parent = await getImportById(id, c)
    if (!parent) {
      throw new ImportExecutionError({
        code: "IMPORT_NOT_FOUND",
        message: "Import not found.",
        status: 404,
      })
    }

    // Step 3 — resolve context for validation.
    const existing = await loadExistingRows(id, c)
    const { productIds, locationIds } = collectReferencedIds(diff)
    const [knownProductIds, locations] = await Promise.all([
      resolveProducts(productIds, c),
      resolveLocations(locationIds, c),
    ])

    // Step 4 — validate diff against domain rules.
    const issues = validateInventoryRowsDiff(
      diff,
      {
        existing: toDiffExisting(existing),
        locations: locations.lookups,
        knownProductIds: Array.from(knownProductIds),
      },
      {
        kind: "import",
        importEntryId: id,
        warehouseId: parent.warehouseId || null,
      },
    )
    if (issues.length > 0) {
      throw new InventoryExecutionError({
        code: "INVENTORY_DIFF_VALIDATION_FAILED",
        message: describeInventoryDiffIssues(issues),
        status: 400,
        payload: { issues },
      })
    }

    // Step 5 — per-row expectedUpdatedAt discipline.
    assertRowVersions(diff, existing)

    // Step 6 — assign tempIds → uuids.
    const addedWithIds = assignInventoryDiffIds(diff.added, () => crypto.randomUUID())
    const addedIds: Record<string, string> = Object.fromEntries(
      addedWithIds.map((entry) => [entry.tempId, entry.id]),
    )

    // Step 7 — apply the diff.
    const { tempIdMap } = await applyImportInventoryRowsDiff(
      {
        importEntryId: id,
        importWarehouseId: parent.warehouseId || null,
        diff,
        addedIds,
        locationIndex: locations.index,
      },
      c,
    )

    // Step 8 — re-read the canonical parent aggregate.
    const importEntry = await getImportDetailById(id, c)
    if (!importEntry) {
      throw new ImportExecutionError({
        code: "IMPORT_NOT_FOUND",
        message: "Import disappeared mid-transaction.",
        status: 404,
      })
    }

    return { importEntry, tempIdMap }
  })
}
