import type { Prisma } from "../../../generated/prisma/client.js"
import { buildFlooringProductDisplayName } from "@builders/domain"
import type { StagedInventoryRow } from "@builders/domain"
import { db } from "../../../client.js"
import {
  stagedInventoryRowSelect,
  type StagedInventoryDbClient,
  type StagedInventoryRowPayload,
} from "./shared.js"

export type StagedInventoryRecord = StagedInventoryRow

function toDecimalString(value: { toString(): string } | null | undefined): string {
  if (value === null || value === undefined) return ""
  return value.toString()
}

export function normalizeStagedInventoryRow(
  row: StagedInventoryRowPayload,
): StagedInventoryRecord {
  return {
    id: row.id,
    importEntryId: row.importEntryId,
    importNumber: row.importEntry.importNumber,
    filterRowId: row.filterRowId,
    productId: row.productId,
    productName: buildFlooringProductDisplayName({
      name: row.product.name,
      style: row.product.style,
      color: row.product.color,
    }),
    categoryId: row.product.category.id,
    categoryName: row.product.category.name,
    categorySlug: row.product.category.slug,
    // stockUnitName / stockUnitAbbrev are sourced from the row's own
    // snapshot columns (stamped at create-time from the parent filter
    // row), not from the product join. Keeps the read shape stable
    // against later product edits.
    stockUnitName: row.stockUnitName ?? "",
    stockUnitAbbrev: row.stockUnitAbbrev ?? "",
    rollPrefix: row.rollPrefix,
    rollNumber: row.rollNumber ?? "",
    dyeLot: row.dyeLot ?? "",
    warehouseId: row.warehouseId,
    warehouseName: row.warehouse.name,
    warehouseNumber: String(row.warehouse.number),
    location: row.location ?? "",
    startingStock: toDecimalString(row.startingStock),
    cost: toDecimalString(row.cost),
    freight: toDecimalString(row.freight),
    status: row.status,
    isImported: row.isImported,
    note: row.note ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function listStagedInventoryByImport(
  importEntryId: string,
  client: StagedInventoryDbClient = db,
): Promise<StagedInventoryRecord[]> {
  const rows = await client.flooringImportStagedInventoryRow.findMany({
    where: { importEntryId },
    select: stagedInventoryRowSelect,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
  return rows.map(normalizeStagedInventoryRow)
}

export async function listStagedInventoryByFilterRow(
  filterRowId: string,
  client: StagedInventoryDbClient = db,
): Promise<StagedInventoryRecord[]> {
  const rows = await client.flooringImportStagedInventoryRow.findMany({
    where: { filterRowId },
    select: stagedInventoryRowSelect,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
  return rows.map(normalizeStagedInventoryRow)
}

export async function getStagedInventoryById(
  id: string,
  client: StagedInventoryDbClient = db,
): Promise<StagedInventoryRecord | null> {
  const row = await client.flooringImportStagedInventoryRow.findUnique({
    where: { id },
    select: stagedInventoryRowSelect,
  })
  return row ? normalizeStagedInventoryRow(row) : null
}

/**
 * Worker-only read primitive for the materialize-import flow. Returns the raw
 * `StagedInventoryRowPayload` (with the full join graph) instead of the
 * normalized `StagedInventoryRecord` because the materialize use case needs
 * the unit abbreviations that the normalizer flattens away.
 *
 * Filters by `status = QUEUED` so any row that drifted state (raced edit /
 * delete / retry) is silently excluded — the caller compares the returned
 * length to the requested id count and dead-letters on mismatch.
 *
 * Transaction-only — no `client = db` default. The materialize use case is
 * always inside `withDatabaseTransaction`.
 */
export async function listStagedInventoryForMaterialization(
  tx: Prisma.TransactionClient,
  input: { importEntryId: string; ids: string[] },
): Promise<StagedInventoryRowPayload[]> {
  if (input.ids.length === 0) return []
  return tx.flooringImportStagedInventoryRow.findMany({
    where: {
      id: { in: input.ids },
      importEntryId: input.importEntryId,
      status: "QUEUED",
    },
    select: stagedInventoryRowSelect,
  })
}
