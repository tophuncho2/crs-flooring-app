import {
  buildFlooringProductDisplayName,
  computeFilterRemainingStock,
} from "@builders/domain"
import type { StagedInventoryFilterRow } from "@builders/domain"
import { db } from "../../client.js"
import {
  stagedInventoryFilterRowSelect,
  type StagedInventoryFilterDbClient,
  type StagedInventoryFilterRowPayload,
} from "./shared.js"

export type StagedInventoryFilterRecord = StagedInventoryFilterRow

function toDecimalString(value: { toString(): string } | null | undefined): string {
  if (value === null || value === undefined) return ""
  return value.toString()
}

/**
 * Sum staged-inventory startingStock per productId across an import.
 *
 * Staged rows no longer FK-link to a filter row; the filter↔staged
 * relationship is now computed by productId (filter rows are unique per
 * import+product, so the per-product sum is exactly the old per-filter
 * sum). This feeds each filter's remainingStock + startingStockSum.
 */
async function sumStartingStockByProduct(
  importEntryId: string,
  client: StagedInventoryFilterDbClient,
): Promise<Map<string, number>> {
  const rows = await client.flooringImportStagedInventoryRow.findMany({
    where: { importEntryId },
    select: { productId: true, startingStock: true },
  })
  const byProduct = new Map<string, number>()
  for (const row of rows) {
    const parsed = Number(row.startingStock.toString())
    if (!Number.isFinite(parsed)) continue
    byProduct.set(row.productId, (byProduct.get(row.productId) ?? 0) + parsed)
  }
  return byProduct
}

export function normalizeStagedInventoryFilterRow(
  row: StagedInventoryFilterRowPayload,
  startingStockSumForProduct: number,
): StagedInventoryFilterRecord {
  const stockOrdered = toDecimalString(row.stockOrdered)
  const startingStockSum = startingStockSumForProduct.toFixed(2)
  const remainingStock = computeFilterRemainingStock({
    stockOrdered,
    childStartingStockSum: startingStockSum,
  })
  return {
    id: row.id,
    importEntryId: row.importEntryId,
    // Category chip label derives from the product's own category (product
    // implies category) — the persisted categoryFilter FK was dropped.
    categoryFilterName: row.product.category.name,
    productId: row.productId,
    productName: buildFlooringProductDisplayName({
      name: row.product.name,
      style: row.product.style,
      color: row.product.color,
    }),
    categoryId: row.product.category.id,
    stockOrdered,
    unitId: row.unitId ?? "",
    // Unit display derives solely from the row's own unit FK join (UoM epic 2B);
    // snapshot columns fully de-referenced (2D drops them).
    unitName: row.unit?.name ?? "",
    unitAbbrev: row.unit?.abbreviation ?? "",
    startingStockSum,
    remainingStock,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function listFilterRowsByImport(
  importEntryId: string,
  client: StagedInventoryFilterDbClient = db,
): Promise<StagedInventoryFilterRecord[]> {
  const [rows, sumByProduct] = await Promise.all([
    client.flooringImportStagedInventoryFilterRow.findMany({
      where: { importEntryId },
      select: stagedInventoryFilterRowSelect,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    sumStartingStockByProduct(importEntryId, client),
  ])
  return rows.map((row) =>
    normalizeStagedInventoryFilterRow(row, sumByProduct.get(row.productId) ?? 0),
  )
}

export async function getFilterRowById(
  id: string,
  client: StagedInventoryFilterDbClient = db,
): Promise<StagedInventoryFilterRecord | null> {
  const row = await client.flooringImportStagedInventoryFilterRow.findUnique({
    where: { id },
    select: stagedInventoryFilterRowSelect,
  })
  if (!row) return null
  const sumByProduct = await sumStartingStockByProduct(row.importEntryId, client)
  return normalizeStagedInventoryFilterRow(row, sumByProduct.get(row.productId) ?? 0)
}

