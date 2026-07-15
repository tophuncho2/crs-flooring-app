import type { Prisma } from "../../generated/prisma/client.js"
import {
  buildFlooringProductDisplayName,
  computeIndicatorStatus,
  describeIndicatorStatus,
  normalizeMoneyAmount,
  type InventoryIndicatorListFilters,
  type InventoryIndicatorRow,
} from "@builders/domain"
import { db } from "../../client.js"
import { exactNumberIntEquals } from "../../shared/exact-number-search.js"
import { sliceHasMore } from "../../shared/paginate.js"
import { combineAnd } from "../../shared/where.js"
import { buildProductSearchClauses } from "../product-list-filters.js"
import { buildIndicatorsListViewOrderBy } from "./order-by.js"
import {
  indicatorRowSelect,
  type InventoryIndicatorDbClient,
  type InventoryIndicatorRowPayload,
} from "./shared.js"

export type InventoryIndicatorRecord = InventoryIndicatorRow

/** One ordered sort column for the indicators list view. */
export type IndicatorsListViewSortEntry = {
  field: string
  direction: "asc" | "desc"
}

/** The resolved multi-column sort passed to `buildIndicatorsListViewOrderBy`. */
export type IndicatorsListViewSort = {
  entries: IndicatorsListViewSortEntry[]
}

function tripleKey(productId: string, warehouseId: string, unitId: string): string {
  return `${productId}|${warehouseId}|${unitId}`
}

/**
 * Live stock for each indicator's (product, warehouse, unit) triple = the SUM of
 * `stockQuantity` over the non-archived inventory rows matching that triple. This
 * is the derived-on-read source for the colored status. One groupBy over the
 * broad IN sets covers the whole page; exact triples are matched back in the map,
 * so over-fetched (product×warehouse×unit) combinations that don't correspond to
 * a real indicator are simply never looked up. Missing triple → 0 on hand.
 */
async function fetchCurrentStockByTriple(
  rows: InventoryIndicatorRowPayload[],
  client: InventoryIndicatorDbClient,
): Promise<Map<string, number>> {
  const stockByTriple = new Map<string, number>()
  if (rows.length === 0) return stockByTriple

  const productIds = [...new Set(rows.map((r) => r.productId))]
  const warehouseIds = [...new Set(rows.map((r) => r.warehouseId))]
  const unitIds = [...new Set(rows.map((r) => r.unitId))]

  const grouped = await client.flooringInventory.groupBy({
    by: ["productId", "warehouseId", "unitId"],
    where: {
      isArchived: false,
      productId: { in: productIds },
      warehouseId: { in: warehouseIds },
      unitId: { in: unitIds },
    },
    _sum: { stockQuantity: true },
  })

  for (const g of grouped) {
    const sum = g._sum.stockQuantity ? g._sum.stockQuantity.toNumber() : 0
    stockByTriple.set(tripleKey(g.productId, g.warehouseId, g.unitId), sum)
  }
  return stockByTriple
}

/**
 * Normalize an indicator payload into the domain read shape. Decimal columns
 * surface as normalized money strings ("" when null) so trailing zeros are
 * canonical (no falsely-dirty rows). `currentStock` is the live triple stock
 * resolved by the caller; the colored `status` is derived from it here.
 */
export function normalizeIndicatorRow(
  row: InventoryIndicatorRowPayload,
  currentStock: number,
): InventoryIndicatorRecord {
  const thresholdNum = row.lowStockThreshold ? row.lowStockThreshold.toNumber() : null
  const status = computeIndicatorStatus(currentStock, thresholdNum)
  return {
    id: row.id,
    indicatorNumber: row.indicatorNumber,
    productId: row.productId,
    productName: buildFlooringProductDisplayName({
      name: row.product.name,
      style: row.product.style,
      color: row.product.color,
    }),
    productNumber: row.product.productNumber,
    warehouseId: row.warehouseId,
    warehouseName: row.warehouse.name,
    unitId: row.unitId,
    unitName: row.unit?.name ?? null,
    unitAbbrev: row.unit?.abbreviation ?? null,
    lowStockThreshold: row.lowStockThreshold
      ? normalizeMoneyAmount(row.lowStockThreshold.toString())
      : "",
    currentStock: normalizeMoneyAmount(currentStock.toString()),
    status,
    statusLabel: describeIndicatorStatus(status),
    internalNotes: row.internalNotes ?? "",
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy ?? null,
    updatedBy: row.updatedBy ?? null,
  }
}

/** Normalize a batch of payloads, resolving each row's live triple stock once. */
async function normalizeIndicatorRows(
  rows: InventoryIndicatorRowPayload[],
  client: InventoryIndicatorDbClient,
): Promise<InventoryIndicatorRecord[]> {
  const stockByTriple = await fetchCurrentStockByTriple(rows, client)
  return rows.map((row) =>
    normalizeIndicatorRow(
      row,
      stockByTriple.get(tripleKey(row.productId, row.warehouseId, row.unitId)) ?? 0,
    ),
  )
}

export async function getIndicatorById(
  id: string,
  client: InventoryIndicatorDbClient = db,
): Promise<InventoryIndicatorRecord | null> {
  const row = await client.flooringInventoryIndicator.findUnique({
    where: { id },
    select: indicatorRowSelect,
  })
  if (!row) return null
  const [normalized] = await normalizeIndicatorRows([row], client)
  return normalized ?? null
}

/**
 * Paginated read of indicators for a single parent product. Powers the indicators
 * section on the product record view. Ordered `createdAt DESC, id DESC`. Fetches
 * take+1 to detect a next page without a separate count query.
 */
export async function listIndicatorsForProduct(
  args: { productId: string; skip: number; take: number },
  client: InventoryIndicatorDbClient = db,
): Promise<{ rows: InventoryIndicatorRecord[]; hasMore: boolean }> {
  const rows = await client.flooringInventoryIndicator.findMany({
    where: { productId: args.productId },
    select: indicatorRowSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: args.skip,
    take: args.take + 1,
  })

  const { page, hasMore } = sliceHasMore(rows, args.take)
  return { rows: await normalizeIndicatorRows(page, client), hasMore }
}

/**
 * Pure `where` builder for the standalone indicators list view, shared by the
 * paginated list read and any export read so both scope identically.
 *   - `id` — the "selected rows" path: an explicit IN over ticked ids, ANDed with
 *     the other filters.
 *   - warehouse/product — IN matches.
 *   - indicatorNumber — EXACT numeric match on the generated `indicatorNumberInt`
 *     btree ("12" → IND-12 only). Bare or prefixed ("IND-12"); non-digits stripped,
 *     a non-numeric query matches nothing via the -1 sentinel.
 */
function buildIndicatorsListViewWhere(
  filters: InventoryIndicatorListFilters,
): Prisma.FlooringInventoryIndicatorWhereInput {
  const where: Prisma.FlooringInventoryIndicatorWhereInput = {}

  const ids = filters.id
  if (ids && ids.length > 0) {
    where.id = { in: [...ids] }
  }

  const warehouseIds = filters.warehouseId
  if (warehouseIds && warehouseIds.length > 0) {
    where.warehouseId = { in: [...warehouseIds] }
  }

  const productIds = filters.productId
  if (productIds && productIds.length > 0) {
    where.productId = { in: [...productIds] }
  }

  // Category and the four shared product-attribute searches both narrow via the
  // live `product` relation, so they combine into ONE `product.is` clause (Prisma
  // allows only one relation key). Product is a direct `productId` match above.
  const productClauses: Prisma.FlooringProductWhereInput[] = []
  const categoryIds = filters.categoryId
  if (categoryIds && categoryIds.length > 0) {
    productClauses.push({ categoryId: { in: [...categoryIds] } })
  }
  productClauses.push(...buildProductSearchClauses(filters))
  const productWhere = combineAnd(productClauses)
  if (productWhere) {
    where.product = { is: productWhere }
  }

  const indicatorNumber = filters.indicatorNumber?.trim()
  if (indicatorNumber) {
    where.indicatorNumberInt = exactNumberIntEquals(indicatorNumber)
  }

  return where
}

export async function listIndicatorsForListView(
  args: {
    filters: InventoryIndicatorListFilters
    page: number
    pageSize: number
    sort?: IndicatorsListViewSort
  },
  client: InventoryIndicatorDbClient = db,
): Promise<{ rows: InventoryIndicatorRecord[]; total: number }> {
  const where = buildIndicatorsListViewWhere(args.filters)
  const skip = (args.page - 1) * args.pageSize

  const [rows, total] = await Promise.all([
    client.flooringInventoryIndicator.findMany({
      where,
      select: indicatorRowSelect,
      orderBy: buildIndicatorsListViewOrderBy(args.sort),
      skip,
      take: args.pageSize,
    }),
    client.flooringInventoryIndicator.count({ where }),
  ])

  return { rows: await normalizeIndicatorRows(rows, client), total }
}
