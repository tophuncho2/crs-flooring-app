import { Prisma, type PrismaClient } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import { parseDecimal, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { validateInventoryLocationSelection } from "@/server/flooring/location-integrity"
import { buildFlooringProductDisplayName } from "@/features/flooring/shared/domain/product-display-name"
import { canCreateInventoryCutLogs, getInventoryCutLogBlockedReason } from "@/features/flooring/inventory/domain/filters"

type DbClient = Prisma.TransactionClient | PrismaClient

function inventoryInclude() {
  return {
    product: {
      select: {
        id: true,
        name: true,
        style: true,
        color: true,
        category: { select: { stockUnit: { select: { name: true } } } },
      },
    },
    location: {
      select: {
        id: true,
        locationCode: true,
        section: { select: { name: true } },
        warehouse: { select: { id: true, name: true } },
      },
    },
    importEntry: {
      select: {
        id: true,
        importNumber: true,
        tag: true,
        status: true,
        transportType: true,
        warehouse: { select: { id: true, name: true } },
      },
    },
  } satisfies Prisma.FlooringInventoryInclude
}

export function toFixedString(value: Prisma.Decimal | number) {
  return Number(value).toFixed(2)
}

export function normalizeInventoryRow(row: {
  id: string
  importEntryId: string | null
  itemNumber: string
  dyeLot: string | null
  stockCount: { toString(): string }
  cost: { toString(): string } | null
  freight: { toString(): string } | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  productId: string
  product: {
    id: string
    name: string
    style: string | null
    color: string | null
    category: { stockUnit: { name: string } | null }
  }
  locationId: string | null
  location: {
    id: string
    locationCode: string
    section: { name: string } | null
    warehouse: { id: string; name: string }
  } | null
  importEntry: {
    id: string
    importNumber: number
    tag: string | null
    status: string
    transportType: string
    warehouse: { id: string; name: string } | null
  } | null
  cutTotal?: { toString(): string } | number | string | null
  cutLogs?: Array<{
    id: string
    inventoryId: string
    before: { toString(): string }
    cut: { toString(): string }
    after: { toString(): string }
    notes: string | null
    createdAt: Date
  }>
}) {
  const cutLogs = row.cutLogs ?? []
  const cutTotal =
    row.cutTotal !== undefined && row.cutTotal !== null
      ? Number(row.cutTotal)
      : cutLogs.reduce((total, log) => total + Number(log.cut), 0)
  const runningBalance = Number(row.stockCount) - cutTotal
  const filterRow = {
    importEntryId: row.importEntryId,
    importStatus: row.importEntry?.status ?? "FINAL",
    importWarehouseId: row.importEntry?.warehouse?.id ?? "",
    warehouseId: row.location?.warehouse.id ?? "",
  }

  return {
    id: row.id,
    importEntryId: row.importEntryId ?? "",
    importWarehouseId: row.importEntry?.warehouse?.id ?? "",
    importNumber: row.importEntry?.importNumber ? String(row.importEntry.importNumber) : "",
    importTag: row.importEntry?.tag ?? "",
    importStatus: row.importEntry?.status ?? "FINAL",
    importTransportType: row.importEntry?.transportType ?? "",
    importWarehouseName: row.importEntry?.warehouse?.name ?? row.location?.warehouse.name ?? "",
    productId: row.productId,
    productName: buildFlooringProductDisplayName(row.product),
    stockUnit: row.product.category.stockUnit?.name ?? "",
    itemNumber: row.itemNumber,
    dyeLot: row.dyeLot ?? "",
    locationId: row.locationId ?? "",
    locationCode: row.location?.locationCode ?? "",
    warehouseId: row.location?.warehouse.id ?? "",
    warehouseName: row.location?.warehouse.name ?? "",
    sectionName: row.location?.section?.name ?? "",
    stockCount: row.stockCount.toString(),
    cutTotal: cutTotal.toFixed(2),
    runningBalance: runningBalance.toFixed(2),
    cost: row.cost?.toString() ?? "",
    freight: row.freight?.toString() ?? "",
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    canCreateCutLogs: canCreateInventoryCutLogs(filterRow),
    cutLogBlockedReason: getInventoryCutLogBlockedReason(filterRow),
    cutLogs: cutLogs.map((log) => ({
      id: log.id,
      inventoryId: log.inventoryId,
      inventoryLabel: `${row.location?.warehouse.name ?? "No warehouse"} / ${row.location?.locationCode ?? "No location"} / Item ${row.itemNumber}${row.dyeLot ? ` / Dye ${row.dyeLot}` : ""}`,
      itemNumber: row.itemNumber,
      before: log.before.toString(),
      cut: log.cut.toString(),
      after: log.after.toString(),
      notes: log.notes ?? "",
      createdAt: log.createdAt.toISOString(),
    })),
  }
}

function parseInventoryDetailMutationBody(body: Record<string, unknown>) {
  return parseInventoryEditableMutationFields(body)
}

function parseInventoryEditableMutationFields(body: Record<string, unknown>) {
  const costValue = body.cost
  const freightValue = body.freight

  return {
    locationId: parseOptionalString(body.locationId),
    itemNumber: parseRequiredString(body.itemNumber, "itemNumber"),
    dyeLot: parseOptionalString(body.dyeLot),
    cost: costValue === "" || costValue === null || costValue === undefined ? null : parseDecimal(costValue, "cost", 2),
    freight:
      freightValue === "" || freightValue === null || freightValue === undefined
        ? null
        : parseDecimal(freightValue, "freight", 2),
    notes: parseOptionalString(body.notes),
  }
}

function parseInventoryMutationBody(body: Record<string, unknown>) {
  return {
    ...parseInventoryEditableMutationFields(body),
    importEntryId: parseOptionalString(body.importEntryId),
    productId: parseRequiredString(body.productId, "productId"),
    stockCount: parseDecimal(body.stockCount, "stockCount", 2),
  }
}

export async function listInventoryRows(db: DbClient = prisma, productId?: string) {
  const inventory = await db.flooringInventory.findMany({
    where: productId ? { productId } : undefined,
    include: {
      ...inventoryInclude(),
      cutLogs: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          inventoryId: true,
          before: true,
          cut: true,
          after: true,
          notes: true,
          createdAt: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { itemNumber: "asc" }],
  })

  return inventory.map(normalizeInventoryRow)
}

export async function createInventoryRow(db: DbClient = prisma, body: Record<string, unknown>) {
  const data = parseInventoryMutationBody(body)
  await validateInventoryLocationSelection(db, {
    importEntryId: data.importEntryId,
    locationId: data.locationId,
  })

  const inventory = await db.flooringInventory.create({
    data,
    include: inventoryInclude(),
  })

  return normalizeInventoryRow(inventory)
}

export async function updateInventoryRow(db: DbClient = prisma, id: string, body: Record<string, unknown>) {
  const data = parseInventoryMutationBody(body)
  await validateInventoryLocationSelection(db, {
    importEntryId: data.importEntryId,
    locationId: data.locationId,
  })

  const inventory = await db.flooringInventory.update({
    where: { id },
    data,
    include: inventoryInclude(),
  })

  return normalizeInventoryRow(inventory)
}

export async function updateInventoryDetailRow(db: DbClient = prisma, id: string, body: Record<string, unknown>) {
  const data = parseInventoryDetailMutationBody(body)
  const existing = await db.flooringInventory.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      importEntryId: true,
    },
  })

  await validateInventoryLocationSelection(db, {
    importEntryId: existing.importEntryId,
    locationId: data.locationId,
  })

  const inventory = await db.flooringInventory.update({
    where: { id },
    data,
    include: inventoryInclude(),
  })

  return normalizeInventoryRow(inventory)
}

export async function deleteInventoryRow(db: DbClient = prisma, id: string) {
  await db.flooringInventory.delete({ where: { id } })
}

export async function listInventoryLocationOptions(db: DbClient = prisma) {
  const rows = await db.flooringLocation.findMany({
    select: {
      id: true,
      warehouseId: true,
      locationCode: true,
      section: { select: { name: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: [{ warehouse: { name: "asc" } }, { locationCode: "asc" }],
  })

  return rows.map((row) => ({
    id: row.id,
    warehouseId: row.warehouseId,
    locationCode: row.locationCode,
    label: row.locationCode,
    sectionName: row.section?.name ?? null,
    warehouseName: row.warehouse.name,
  }))
}
