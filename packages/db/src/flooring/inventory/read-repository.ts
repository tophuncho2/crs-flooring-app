import {
  buildFlooringProductDisplayName,
  computeCutCoverage,
  computeInventoryAvailableCoverage,
  formatFullLocationCode,
  formatLocationRafterLevel,
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
  isImported?: boolean
}

export type InventoryCutLogAggregate = {
  awaitingCut: number
  totalCut: number
}

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  const parsed = typeof value === "number" ? value : Number(value.toString())
  return Number.isFinite(parsed) ? parsed : 0
}

function toFixedString(value: number): string {
  return value.toFixed(2)
}

function toDecimalString(value: { toString(): string } | null | undefined): string {
  if (value === null || value === undefined) return ""
  return value.toString()
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

function formatCoverage(value: number | null): string {
  return value === null ? "" : toFixedString(value)
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
    coverage: formatCoverage(coverage),
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function normalizeInventoryRow(
  payload: InventoryRowPayload,
  aggregate: InventoryCutLogAggregate = { awaitingCut: 0, totalCut: 0 },
): InventoryRecord {
  const stockCount = toNumber(payload.stockCount)
  const uncut = stockCount - aggregate.totalCut
  const available = stockCount - (aggregate.awaitingCut + aggregate.totalCut)
  const coveragePerUnit = payload.product.coveragePerUnit === null ? null : toNumber(payload.product.coveragePerUnit)
  const costNum = toNumber(payload.cost)
  const pricePerUnit = stockCount > 0 ? costNum / stockCount : 0

  const locationCode = buildLocationCode(payload.location)
  const locationShortCode = buildLocationShortCode(payload.location)
  const location = payload.location
  const importEntry = payload.importEntry

  return {
    id: payload.id,
    importEntryId: payload.importEntryId ?? "",
    importNumber: importEntry ? String(importEntry.importNumber) : "",
    importWarehouseId: importEntry?.warehouseId ?? "",
    importWarehouseName: importEntry?.warehouse?.name ?? "",
    productId: payload.productId,
    productName: payload.product.name,
    categoryId: payload.product.category.id,
    categoryName: payload.product.category.name,
    stockUnit: payload.product.category.stockUnit?.name ?? "",
    sendUnit: payload.product.category.sendUnit?.name ?? "",
    coveragePerUnit: coveragePerUnit === null ? "" : toDecimalString(payload.product.coveragePerUnit),
    itemNumber: payload.itemNumber,
    dyeLot: payload.dyeLot ?? "",
    warehouseId: payload.warehouseId ?? "",
    warehouseName: payload.warehouse?.name ?? "",
    warehouseNumber: payload.warehouse ? String(payload.warehouse.number) : "",
    locationId: payload.locationId ?? "",
    locationCode,
    locationShortCode,
    sectionNumber: location?.section ? String(location.section.number) : "",
    rafter: location ? String(location.rafter) : "",
    level: location ? String(location.level) : "",
    stockCount: toDecimalString(payload.stockCount),
    cost: toDecimalString(payload.cost),
    freight: toDecimalString(payload.freight),
    pricePerUnit: toFixedString(pricePerUnit),
    notes: payload.notes ?? "",
    isImported: payload.isImported,
    fifoReceivedAt: payload.fifoReceivedAt.toISOString(),
    createdAt: payload.createdAt.toISOString(),
    updatedAt: payload.updatedAt.toISOString(),
    uncutBalance: toFixedString(uncut),
    availableBalance: toFixedString(available),
    availableCoverage: formatCoverage(
      computeInventoryAvailableCoverage({
        availableBalance: available,
        coveragePerUnit,
        category: { slug: payload.product.category.slug },
      }),
    ),
    awaitingCutBalance: toFixedString(aggregate.awaitingCut),
    totalCutBalance: toFixedString(aggregate.totalCut),
  }
}

export function normalizeInventoryDetail(
  payload: InventoryDetailPayload,
  aggregate?: InventoryCutLogAggregate,
): InventoryDetailRecord {
  const resolved = aggregate ?? aggregateCutLogs(payload.cutLogs)
  const categorySlug = payload.product.category.slug
  const coveragePerUnit =
    payload.product.coveragePerUnit === null ? null : toNumber(payload.product.coveragePerUnit)
  const context: CutLogNormalizeContext = { categorySlug, coveragePerUnit }
  return {
    ...normalizeInventoryRow(payload, resolved),
    cutLogs: payload.cutLogs.map((log) => normalizeCutLogRow(log, context)),
  }
}

function aggregateCutLogs(cutLogs: CutLogRowPayload[]): InventoryCutLogAggregate {
  let awaitingCut = 0
  let totalCut = 0
  for (const log of cutLogs) {
    const amount = toNumber(log.cut)
    if (log.status === "FINAL") totalCut += amount
    else awaitingCut += amount
  }
  return { awaitingCut, totalCut }
}

async function fetchCutLogAggregates(
  inventoryIds: string[],
  client: InventoryDbClient,
): Promise<Map<string, InventoryCutLogAggregate>> {
  const result = new Map<string, InventoryCutLogAggregate>()
  if (inventoryIds.length === 0) return result
  const rows = await client.flooringCutLog.groupBy({
    by: ["inventoryId", "status"],
    where: { inventoryId: { in: inventoryIds } },
    _sum: { cut: true },
  })
  for (const row of rows) {
    const prior = result.get(row.inventoryId) ?? { awaitingCut: 0, totalCut: 0 }
    const amount = toNumber(row._sum.cut)
    if (row.status === "FINAL") prior.totalCut += amount
    else prior.awaitingCut += amount
    result.set(row.inventoryId, prior)
  }
  return result
}

function buildListWhere(filter?: InventoryListFilter) {
  if (!filter) return undefined
  const where: Record<string, unknown> = {}
  if (filter.importEntryId) where.importEntryId = filter.importEntryId
  if (filter.warehouseId) where.warehouseId = filter.warehouseId
  if (filter.productId) where.productId = filter.productId
  if (filter.categoryId) where.product = { categoryId: filter.categoryId }
  if (filter.isImported !== undefined) where.isImported = filter.isImported
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
  const aggregates = await fetchCutLogAggregates(
    rows.map((row) => row.id),
    client,
  )
  return rows.map((row) => normalizeInventoryRow(row, aggregates.get(row.id)))
}

export async function getInventoryById(
  id: string,
  client: InventoryDbClient = db,
): Promise<InventoryRecord | null> {
  const row = await client.flooringInventory.findUnique({
    where: { id },
    select: inventoryRowSelect,
  })
  if (!row) return null
  const aggregates = await fetchCutLogAggregates([id], client)
  return normalizeInventoryRow(row, aggregates.get(id))
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

