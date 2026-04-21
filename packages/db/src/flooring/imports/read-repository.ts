import { buildFlooringProductDisplayName, calculateImportSummary } from "@builders/domain"
import { db } from "../../client.js"
import {
  importDetailSelect,
  importRowSelect,
  type ImportDetailPayload,
  type ImportInventoryPayload,
  type ImportRowPayload,
  type ImportsDbClient,
} from "./shared.js"

export type ImportInventoryRecord = {
  id: string
  productId: string
  productName: string
  stockUnit: string
  itemNumber: string
  dyeLot: string
  stockCount: string
  cost: string
  freight: string
  notes: string
  locationId: string
  locationCode: string
  warehouseId: string
  warehouseName: string
  sectionName: string
  updatedAt: string
}

export type ImportRecord = {
  id: string
  importNumber: number
  orderNumber: string
  tag: string
  transportType: string
  status: string
  notes: string
  warehouseId: string
  warehouseName: string
  itemsCount: number
  totalCost: number
  totalCostLabel: string
  createdAt: string
  updatedAt: string
}

export type ImportCostAggregate = { cost: number; freight: number }

export type ImportDetailRecord = ImportRecord & {
  inventories: ImportInventoryRecord[]
}

function formatImportLocationCode(location: ImportInventoryPayload["location"]): string {
  if (!location) return ""
  return `W${location.warehouse.number}-S${location.section.number}-R${location.rafter}-L${location.level}`
}

export function normalizeImportInventoryRow(row: ImportInventoryPayload): ImportInventoryRecord {
  return {
    id: row.id,
    productId: row.productId,
    productName: buildFlooringProductDisplayName(row.product),
    stockUnit: row.product.category.stockUnit?.name ?? "",
    itemNumber: row.itemNumber,
    dyeLot: row.dyeLot ?? "",
    stockCount: row.stockCount.toString(),
    cost: row.cost?.toString() ?? "",
    freight: row.freight?.toString() ?? "",
    notes: row.notes ?? "",
    locationId: row.locationId ?? "",
    locationCode: formatImportLocationCode(row.location),
    warehouseId: row.location?.warehouse.id ?? "",
    warehouseName: row.location?.warehouse.name ?? "",
    sectionName: row.location?.section ? String(row.location.section.number) : "",
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function normalizeImportRow(
  row: ImportRowPayload,
  aggregate: ImportCostAggregate = { cost: 0, freight: 0 },
): ImportRecord {
  const summary = calculateImportSummary([
    { stockCount: 0, cost: aggregate.cost, freight: aggregate.freight },
  ])
  return {
    id: row.id,
    importNumber: row.importNumber,
    orderNumber: row.orderNumber ?? "",
    tag: row.tag ?? "",
    transportType: row.transportType,
    status: row.status,
    notes: row.notes ?? "",
    warehouseId: row.warehouseId ?? "",
    warehouseName: row.warehouse?.name ?? "",
    itemsCount: row._count.inventories,
    totalCost: summary.totalCost,
    totalCostLabel: summary.totalCostLabel,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function normalizeImportDetail(row: ImportDetailPayload): ImportDetailRecord {
  const inventoryItems = row.inventories.map((inv) => ({
    stockCount: inv.stockCount.toString(),
    cost: inv.cost?.toString() ?? "0",
    freight: inv.freight?.toString() ?? "0",
  }))
  const summary = calculateImportSummary(inventoryItems)
  const base: ImportRecord = {
    id: row.id,
    importNumber: row.importNumber,
    orderNumber: row.orderNumber ?? "",
    tag: row.tag ?? "",
    transportType: row.transportType,
    status: row.status,
    notes: row.notes ?? "",
    warehouseId: row.warehouseId ?? "",
    warehouseName: row.warehouse?.name ?? "",
    itemsCount: row._count.inventories,
    totalCost: summary.totalCost,
    totalCostLabel: summary.totalCostLabel,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
  return {
    ...base,
    inventories: row.inventories.map(normalizeImportInventoryRow),
  }
}

async function fetchImportCostAggregates(
  ids: string[],
  client: ImportsDbClient,
): Promise<Map<string, ImportCostAggregate>> {
  if (ids.length === 0) return new Map()
  const aggregates = await client.flooringInventory.groupBy({
    by: ["importEntryId"],
    where: { importEntryId: { in: ids } },
    _sum: { cost: true, freight: true },
  })
  const map = new Map<string, ImportCostAggregate>()
  for (const entry of aggregates) {
    if (!entry.importEntryId) continue
    map.set(entry.importEntryId, {
      cost: Number(entry._sum.cost ?? 0),
      freight: Number(entry._sum.freight ?? 0),
    })
  }
  return map
}

export async function listImports(client: ImportsDbClient = db): Promise<ImportRecord[]> {
  const rows = await client.flooringImportEntry.findMany({
    select: importRowSelect,
    orderBy: [{ createdAt: "desc" }, { importNumber: "desc" }],
  })
  const aggregates = await fetchImportCostAggregates(
    rows.map((row) => row.id),
    client,
  )
  return rows.map((row) => normalizeImportRow(row, aggregates.get(row.id)))
}

export async function getImportById(
  id: string,
  client: ImportsDbClient = db,
): Promise<ImportRecord | null> {
  const row = await client.flooringImportEntry.findUnique({
    where: { id },
    select: importRowSelect,
  })
  if (!row) return null
  const aggregates = await fetchImportCostAggregates([id], client)
  return normalizeImportRow(row, aggregates.get(id))
}

export async function getImportDetailById(
  id: string,
  client: ImportsDbClient = db,
): Promise<ImportDetailRecord | null> {
  const row = await client.flooringImportEntry.findUnique({
    where: { id },
    select: importDetailSelect,
  })
  return row ? normalizeImportDetail(row) : null
}

export async function getImportDeleteState(
  id: string,
  client: ImportsDbClient = db,
): Promise<{ hasInventory: boolean } | null> {
  const row = await client.flooringImportEntry.findUnique({
    where: { id },
    select: { _count: { select: { inventories: true } } },
  })
  if (!row) return null
  return { hasInventory: row._count.inventories > 0 }
}

export type ImportWarehouseOption = { id: string; name: string; number: number }

export type ImportLocationOption = {
  id: string
  warehouseId: string
  locationCode: string
  sectionNumber: number | null
  warehouseName: string
}

export type ImportProductOption = {
  id: string
  name: string
  style: string | null
  color: string | null
  stockUnit: string
}

export type ImportFormOptions = {
  warehouses: ImportWarehouseOption[]
  locations: ImportLocationOption[]
  products: ImportProductOption[]
}

export async function listImportOptions(client: ImportsDbClient = db): Promise<ImportFormOptions> {
  const [warehouses, locations, products] = await Promise.all([
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
    client.flooringProduct.findMany({
      select: {
        id: true,
        name: true,
        style: true,
        color: true,
        category: { select: { stockUnit: { select: { name: true } } } },
      },
      orderBy: { name: "asc" },
    }),
  ])

  return {
    warehouses,
    locations: locations.map((row) => ({
      id: row.id,
      warehouseId: row.warehouseId,
      locationCode: `W${row.warehouse.number}-S${row.section.number}-R${row.rafter}-L${row.level}`,
      sectionNumber: row.section.number,
      warehouseName: row.warehouse.name,
    })),
    products: products.map((row) => ({
      id: row.id,
      name: row.name,
      style: row.style,
      color: row.color,
      stockUnit: row.category.stockUnit?.name ?? "",
    })),
  }
}
