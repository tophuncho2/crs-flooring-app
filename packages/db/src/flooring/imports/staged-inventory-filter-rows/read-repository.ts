import {
  buildFlooringProductDisplayName,
  computeFilterRemainingStock,
} from "@builders/domain"
import type { StagedInventoryFilterRow } from "@builders/domain"
import { db } from "../../../client.js"
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

function sumChildStartingStock(
  rows: ReadonlyArray<{ startingStock: { toString(): string } }>,
): string {
  let total = 0
  for (const child of rows) {
    const parsed = Number(child.startingStock.toString())
    if (Number.isFinite(parsed)) total += parsed
  }
  return total.toFixed(2)
}

export function normalizeStagedInventoryFilterRow(
  row: StagedInventoryFilterRowPayload,
): StagedInventoryFilterRecord {
  const stockOrdered = toDecimalString(row.stockOrdered)
  const startingStockSum = sumChildStartingStock(row.stagedInventoryRows)
  const remainingStock = computeFilterRemainingStock({
    stockOrdered,
    childStartingStockSum: startingStockSum,
  })
  return {
    id: row.id,
    importEntryId: row.importEntryId,
    categoryFilterId: row.categoryFilterId,
    categoryFilterName: row.categoryFilter?.name ?? null,
    categoryFilterSlug: row.categoryFilter?.slug ?? null,
    productId: row.productId,
    productName: buildFlooringProductDisplayName({
      name: row.product.name,
      style: row.product.style,
      color: row.product.color,
    }),
    categoryId: row.product.category.id,
    categoryName: row.product.category.name,
    categorySlug: row.product.category.slug,
    stockOrdered,
    stockUnitName: row.stockUnitName ?? "",
    stockUnitAbbrev: row.stockUnitAbbrev ?? "",
    childRowCount: row.stagedInventoryRows.length,
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
  const rows = await client.flooringImportStagedInventoryFilterRow.findMany({
    where: { importEntryId },
    select: stagedInventoryFilterRowSelect,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
  return rows.map(normalizeStagedInventoryFilterRow)
}

export async function getFilterRowById(
  id: string,
  client: StagedInventoryFilterDbClient = db,
): Promise<StagedInventoryFilterRecord | null> {
  const row = await client.flooringImportStagedInventoryFilterRow.findUnique({
    where: { id },
    select: stagedInventoryFilterRowSelect,
  })
  return row ? normalizeStagedInventoryFilterRow(row) : null
}

/**
 * Slim read used by the application save use case to evaluate diff
 * rules (product-locked-with-children, delete-blocked-by-children).
 * Skips the heavy product / category / unit joins; child rows are
 * included only to count them.
 */
export type FilterRowDiffSummary = {
  id: string
  productId: string
  hasChildren: boolean
}

export async function listFilterRowDiffSummariesByImport(
  importEntryId: string,
  client: StagedInventoryFilterDbClient = db,
): Promise<FilterRowDiffSummary[]> {
  const rows = await client.flooringImportStagedInventoryFilterRow.findMany({
    where: { importEntryId },
    select: {
      id: true,
      productId: true,
      _count: { select: { stagedInventoryRows: true } },
    },
  })
  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    hasChildren: row._count.stagedInventoryRows > 0,
  }))
}
