import {
  buildFlooringProductDisplayName,
  computeCutCoverage,
  computeInventoryBalance,
  computeInventoryCoverage,
  formatFullLocationCode,
  formatLocationRafterLevel,
  toInventoryFixedString,
} from "@builders/domain"
import type {
  CutLogRow,
  InventoryDetail,
  InventoryFormOptions,
  InventoryRow,
} from "@builders/domain"
import { db } from "../../client.js"
import {
  cutLogRowSelect,
  inventoryDetailSelect,
  inventoryRowSelect,
  type CutLogRowPayload,
  type InventoryDbClient,
  type InventoryDetailPayload,
  type InventoryRowPayload,
} from "./shared.js"

export type InventoryRecord = InventoryRow
export type InventoryDetailRecord = InventoryDetail
export type InventoryCutLogRecord = CutLogRow

export type InventoryListFilter = {
  importEntryId?: string
  warehouseId?: string
  productId?: string
  categoryId?: string
  isArchived?: boolean
}

function toDecimalString(value: { toString(): string } | null | undefined): string {
  if (value === null || value === undefined) return ""
  return value.toString()
}

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  const parsed = typeof value === "number" ? value : Number(value.toString())
  return Number.isFinite(parsed) ? parsed : 0
}

function buildLocationCode(location: InventoryRowPayload["location"]): string {
  if (!location) return ""
  return formatFullLocationCode({
    warehouseNumber: location.warehouse.number,
    sectionNumber: location.section.number,
    rafter: location.rafter,
    level: location.level,
  })
}

function buildLocationShortCode(location: InventoryRowPayload["location"]): string {
  if (!location) return ""
  return formatLocationRafterLevel({ rafter: location.rafter, level: location.level })
}

export type CutLogNormalizeContext = {
  categorySlug: string | null
  coveragePerUnit: number | null
}

export function normalizeCutLogRow(
  row: CutLogRowPayload,
  context: CutLogNormalizeContext,
): InventoryCutLogRecord {
  const status = row.status === "FINAL" ? "FINAL" : "PENDING"
  const cutNumber = toNumber(row.cut)
  const coverage = computeCutCoverage({
    cut: cutNumber,
    coveragePerUnit: context.coveragePerUnit,
    category: { slug: context.categorySlug },
  })
  return {
    id: row.id,
    inventoryId: row.inventoryId,
    workOrderId: row.workOrderId ?? null,
    workOrderItemId: row.workOrderItemId ?? null,
    before: row.before.toString(),
    cut: row.cut.toString(),
    after: row.after.toString(),
    status,
    isWaste: row.isWaste,
    cost: toDecimalString(row.cost),
    freight: toDecimalString(row.freight),
    coverage: coverage === null ? "" : toInventoryFixedString(coverage),
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * Normalize an inventory row into the domain read shape. Stamps the two
 * computed fields (`balance`, `coverage`) by calling the pure domain helpers
 * — single source of truth for the math. Per the data-package carve-out, this
 * is a data-layer normalizer reusing pure domain formatters/computations; it
 * MUST NOT call domain rules that throw.
 */
export function normalizeInventoryRow(payload: InventoryRowPayload): InventoryRecord {
  // Read the snapshot column, not the joined product.category.slug. The
  // snapshot is stamped at worker-create time and is immutable thereafter;
  // the product's category can no longer change while inventory exists (see
  // isProductCategoryChangeBlocked), so the joined display fields
  // categoryId/categoryName on product.category stay consistent with this
  // slug by construction.
  const categorySlug = payload.categorySlug
  const balanceNum = computeInventoryBalance({
    startingStock: payload.startingStock.toString(),
    totalCutSum: payload.totalCutSum.toString(),
  })
  const coverageNum = computeInventoryCoverage({
    balance: balanceNum,
    coveragePerUnit:
      payload.coveragePerUnit === null ? null : payload.coveragePerUnit.toString(),
    categorySlug,
  })

  const location = payload.location
  const importEntry = payload.importEntry

  return {
    id: payload.id,
    importEntryId: payload.importEntryId ?? "",
    importNumber: importEntry ? String(importEntry.importNumber) : "",
    importWarehouseId: importEntry?.warehouseId ?? "",
    importWarehouseName: importEntry?.warehouse?.name ?? "",
    productId: payload.productId,
    productName: buildFlooringProductDisplayName({
      name: payload.product.name,
      style: payload.product.style,
      color: payload.product.color,
    }),
    categoryId: payload.product.category.id,
    categoryName: payload.product.category.name,
    categorySlug,
    stockUnit: payload.product.category.stockUnit?.name ?? "",
    sendUnit: payload.product.category.sendUnit?.name ?? "",
    itemNumber: payload.itemNumber,
    dyeLot: payload.dyeLot ?? "",
    warehouseId: payload.warehouseId,
    warehouseName: payload.warehouse.name,
    warehouseNumber: String(payload.warehouse.number),
    locationId: payload.locationId ?? "",
    locationCode: buildLocationCode(location),
    locationShortCode: buildLocationShortCode(location),
    sectionNumber: location?.section ? String(location.section.number) : "",
    rafter: location ? String(location.rafter) : "",
    level: location ? String(location.level) : "",
    startingStock: toDecimalString(payload.startingStock),
    totalCutSum: toDecimalString(payload.totalCutSum),
    cost: toDecimalString(payload.cost),
    freight: toDecimalString(payload.freight),
    costPerUnit: toDecimalString(payload.costPerUnit),
    freightPerUnit: toDecimalString(payload.freightPerUnit),
    coveragePerUnit: toDecimalString(payload.coveragePerUnit),
    balance: toInventoryFixedString(balanceNum),
    coverage: coverageNum === null ? "" : toInventoryFixedString(coverageNum),
    isArchived: payload.isArchived,
    notes: payload.notes ?? "",
    fifoReceivedAt: payload.fifoReceivedAt.toISOString(),
    createdAt: payload.createdAt.toISOString(),
    updatedAt: payload.updatedAt.toISOString(),
  }
}

export function normalizeInventoryDetail(
  payload: InventoryDetailPayload,
): InventoryDetailRecord {
  const categorySlug = payload.categorySlug
  const coveragePerUnit =
    payload.coveragePerUnit === null ? null : toNumber(payload.coveragePerUnit)
  const context: CutLogNormalizeContext = { categorySlug, coveragePerUnit }
  return {
    ...normalizeInventoryRow(payload),
    cutLogs: payload.cutLogs.map((log) => normalizeCutLogRow(log, context)),
  }
}

function buildListWhere(filter?: InventoryListFilter) {
  if (!filter) return undefined
  const where: Record<string, unknown> = {}
  if (filter.importEntryId) where.importEntryId = filter.importEntryId
  if (filter.warehouseId) where.warehouseId = filter.warehouseId
  if (filter.productId) where.productId = filter.productId
  if (filter.categoryId) where.product = { categoryId: filter.categoryId }
  if (filter.isArchived !== undefined) where.isArchived = filter.isArchived
  return where
}

export async function listInventory(
  filter?: InventoryListFilter,
  client: InventoryDbClient = db,
): Promise<InventoryRecord[]> {
  const rows = await client.flooringInventory.findMany({
    where: buildListWhere(filter),
    select: inventoryRowSelect,
    orderBy: [{ fifoReceivedAt: "asc" }, { itemNumber: "asc" }, { id: "asc" }],
  })
  return rows.map(normalizeInventoryRow)
}

export async function getInventoryById(
  id: string,
  client: InventoryDbClient = db,
): Promise<InventoryRecord | null> {
  const row = await client.flooringInventory.findUnique({
    where: { id },
    select: inventoryRowSelect,
  })
  return row ? normalizeInventoryRow(row) : null
}

export async function getInventoryDetailById(
  id: string,
  client: InventoryDbClient = db,
): Promise<InventoryDetailRecord | null> {
  const row = await client.flooringInventory.findUnique({
    where: { id },
    select: inventoryDetailSelect,
  })
  return row ? normalizeInventoryDetail(row) : null
}

export async function countInventory(
  filter?: InventoryListFilter,
  client: InventoryDbClient = db,
): Promise<number> {
  return client.flooringInventory.count({ where: buildListWhere(filter) })
}

export async function getInventoryDeleteState(
  id: string,
  client: InventoryDbClient = db,
): Promise<{ hasCutLogs: boolean; cutLogsCount: number } | null> {
  const row = await client.flooringInventory.findUnique({
    where: { id },
    select: { _count: { select: { cutLogs: true } } },
  })
  if (!row) return null
  const cutLogsCount = row._count.cutLogs
  return { hasCutLogs: cutLogsCount > 0, cutLogsCount }
}

export async function countInventoriesByProductId(
  productId: string,
  client: InventoryDbClient = db,
): Promise<number> {
  return client.flooringInventory.count({ where: { productId } })
}

export async function listInventoryOptions(
  client: InventoryDbClient = db,
): Promise<InventoryFormOptions> {
  const [products, warehouses, locations, categories] = await Promise.all([
    client.flooringProduct.findMany({
      select: {
        id: true,
        name: true,
        style: true,
        color: true,
        categoryId: true,
        coveragePerUnit: true,
        category: {
          select: {
            slug: true,
            stockUnit: { select: { name: true } },
            sendUnit: { select: { name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    client.flooringWarehouse.findMany({
      select: { id: true, name: true, number: true },
      orderBy: { number: "asc" },
    }),
    client.flooringLocation.findMany({
      select: {
        id: true,
        warehouseId: true,
        rafter: true,
        level: true,
        section: { select: { number: true } },
        warehouse: { select: { name: true, number: true } },
      },
      orderBy: [{ warehouse: { name: "asc" } }, { rafter: "asc" }, { level: "asc" }],
    }),
    client.flooringCategory.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return {
    products: products.map((row) => ({
      id: row.id,
      name: row.name,
      label: buildFlooringProductDisplayName({
        name: row.name,
        style: row.style,
        color: row.color,
      }),
      style: row.style,
      color: row.color,
      categoryId: row.categoryId,
      categorySlug: row.category.slug,
      stockUnit: row.category.stockUnit?.name ?? "",
      sendUnit: row.category.sendUnit?.name ?? "",
      coveragePerUnit: toDecimalString(row.coveragePerUnit),
    })),
    warehouses,
    locations: locations.map((row) => ({
      id: row.id,
      warehouseId: row.warehouseId,
      locationCode: formatFullLocationCode({
        warehouseNumber: row.warehouse.number,
        sectionNumber: row.section.number,
        rafter: row.rafter,
        level: row.level,
      }),
      shortCode: formatLocationRafterLevel({ rafter: row.rafter, level: row.level }),
      sectionNumber: row.section.number,
      warehouseName: row.warehouse.name,
    })),
    categories,
  }
}
