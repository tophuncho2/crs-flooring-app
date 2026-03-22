import { Prisma, type PrismaClient } from "@prisma/client"
import { prisma } from "@/server/db/prisma"
import {
  createAppError,
  parseDecimal,
  parseOptionalString,
  parseRequiredString,
} from "@/server/http/api-helpers"
import { buildFlooringProductDisplayName } from "@/features/flooring/shared/domain/product-display-name"

type DbClient = Prisma.TransactionClient | PrismaClient
type RootDbClient = PrismaClient

const IMPORT_STATUS_OPTIONS = new Set(["PENDING", "FINAL"])
const TRANSPORT_TYPE_OPTIONS = new Set(["RETURN", "PURCHASE_ORDER"])

type ParsedImportItem = {
  productId: string
  itemNumber: string
  dyeLot: string | null
  stockCount: Prisma.Decimal
  cost: Prisma.Decimal | null
  freight: Prisma.Decimal | null
  notes: string | null
  locationId: string | null
}

function parseImportStatus(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")

  if (!IMPORT_STATUS_OPTIONS.has(normalized)) {
    throw createAppError(`status must be one of ${Array.from(IMPORT_STATUS_OPTIONS).join(", ")}`, { field: "status" })
  }

  return normalized
}

function parseTransportType(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")

  if (!TRANSPORT_TYPE_OPTIONS.has(normalized)) {
    throw createAppError(`transportType must be one of ${Array.from(TRANSPORT_TYPE_OPTIONS).join(", ")}`, {
      field: "transportType",
    })
  }

  return normalized
}

function parseOptionalDecimal(value: unknown, field: string, scale: number) {
  if (value === undefined || value === null || String(value).trim() === "") return null
  return parseDecimal(value, field, scale)
}

function parseImportItems(items: unknown[]): ParsedImportItem[] {
  return items.flatMap((item, index) => {
    if (!item || typeof item !== "object") return []

    const row = item as Record<string, unknown>
    return [
      {
        productId: parseRequiredString(row.productId, `Item ${index + 1}: product`),
        itemNumber: String(row.itemNumber ?? "").trim(),
        dyeLot: parseOptionalString(row.dyeLot),
        stockCount: parseDecimal(row.stockCount, `Item ${index + 1}: stockCount`, 2),
        cost: parseOptionalDecimal(row.cost, `Item ${index + 1}: cost`, 2),
        freight: parseOptionalDecimal(row.freight, `Item ${index + 1}: freight`, 2),
        notes: parseOptionalString(row.notes),
        locationId: parseOptionalString(row.locationId),
      },
    ]
  })
}

async function validateImportLocationIds(db: DbClient, warehouseId: string | null, items: ParsedImportItem[]) {
  const explicitLocationIds = items.map((item) => item.locationId).filter((value): value is string => Boolean(value))
  if (explicitLocationIds.length === 0) return items

  const locations = await db.flooringLocation.findMany({
    where: { id: { in: explicitLocationIds } },
    select: { id: true, warehouseId: true, sectionId: true },
  })
  const locationMap = new Map(locations.map((location) => [location.id, location]))

  return items.map((item, index) => {
    if (!item.locationId) return item

    const location = locationMap.get(item.locationId)
    if (!location) {
      throw createAppError(`Item ${index + 1}: location is invalid`, { field: "locationId" })
    }
    if (!location.sectionId) {
      throw createAppError(`Item ${index + 1}: location must belong to a section`, { field: "locationId" })
    }
    if (warehouseId && location.warehouseId !== warehouseId) {
      throw createAppError(`Item ${index + 1}: location does not belong to the selected warehouse`, {
        field: "locationId",
      })
    }

    return item
  })
}

function importEntryInclude() {
  return {
    warehouse: { select: { id: true, name: true } },
    _count: { select: { inventories: true } },
    inventories: {
      include: {
        product: {
          select: {
            id: true,
            name: true,
            manufacturerName: true,
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
      },
      orderBy: [{ createdAt: "asc" }],
    },
  } satisfies Prisma.FlooringImportEntryInclude
}

export function normalizeImportInventory(row: {
  id: string
  productId: string
  itemNumber: string
  dyeLot: string | null
  stockCount: Prisma.Decimal
  cost: Prisma.Decimal | null
  freight: Prisma.Decimal | null
  notes: string | null
  locationId: string | null
  product: {
    id: string
    name: string
    manufacturerName: string | null
    style: string | null
    color: string | null
    category: { stockUnit: { name: string } | null }
  }
  location: {
    id: string
    locationCode: string
    section: { name: string } | null
    warehouse: { id: string; name: string }
  } | null
}) {
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
    locationCode: row.location?.locationCode ?? "",
    warehouseId: row.location?.warehouse.id ?? "",
    warehouseName: row.location?.warehouse.name ?? "",
    sectionName: row.location?.section?.name ?? "",
  }
}

export function normalizeImportEntry(entry: {
  id: string
  importNumber: number
  orderNumber: string | null
  tag: string | null
  transportType: string
  status: string
  notes: string | null
  warehouseId: string | null
  warehouse: { id: string; name: string } | null
  createdAt: Date
  updatedAt: Date
  inventories?: Array<Parameters<typeof normalizeImportInventory>[0]>
  _count?: { inventories: number }
}) {
  return {
    id: entry.id,
    importNumber: entry.importNumber,
    orderNumber: entry.orderNumber ?? "",
    tag: entry.tag ?? "",
    transportType: entry.transportType,
    status: entry.status,
    notes: entry.notes ?? "",
    warehouseId: entry.warehouseId ?? "",
    warehouseName: entry.warehouse?.name ?? "",
    itemsCount: entry._count?.inventories ?? entry.inventories?.length ?? 0,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    inventories: entry.inventories?.map(normalizeImportInventory) ?? [],
  }
}

export async function listImportEntries(db: DbClient = prisma) {
  const entries = await db.flooringImportEntry.findMany({
    include: {
      warehouse: { select: { id: true, name: true } },
      _count: { select: { inventories: true } },
    },
    orderBy: [{ createdAt: "desc" }, { importNumber: "desc" }],
  })

  return entries.map(normalizeImportEntry)
}

export async function createImportEntry(db: RootDbClient, body: Record<string, unknown>) {
  const parsedItems = parseImportItems(Array.isArray(body.items) ? body.items : [])

  return db.$transaction(async (tx) => {
    const warehouseId = parseOptionalString(body.warehouseId)
    const validatedItems = await validateImportLocationIds(tx, warehouseId, parsedItems)

    const entry = await tx.flooringImportEntry.create({
      data: {
        orderNumber: parseOptionalString(body.orderNumber),
        tag: parseOptionalString(body.tag),
        transportType: parseTransportType(body.transportType),
        status: parseImportStatus(body.status),
        notes: parseOptionalString(body.notes),
        warehouseId,
      },
    })

    for (const item of validatedItems) {
      await tx.flooringInventory.create({
        data: {
          importEntryId: entry.id,
          productId: item.productId,
          itemNumber: item.itemNumber,
          dyeLot: item.dyeLot,
          stockCount: item.stockCount,
          cost: item.cost,
          freight: item.freight,
          notes: item.notes,
          locationId: item.locationId,
        },
      })
    }

    return tx.flooringImportEntry.findUniqueOrThrow({
      where: { id: entry.id },
      include: importEntryInclude(),
    })
  })
}

export async function updateImportEntry(db: RootDbClient, id: string, body: Record<string, unknown>) {
  const parsedItems = parseImportItems(Array.isArray(body.items) ? body.items : [])

  return db.$transaction(async (tx) => {
    const warehouseId = parseOptionalString(body.warehouseId)
    const validatedItems = await validateImportLocationIds(tx, warehouseId, parsedItems)

    await tx.flooringImportEntry.update({
      where: { id },
      data: {
        orderNumber: parseOptionalString(body.orderNumber),
        tag: parseOptionalString(body.tag),
        transportType: parseTransportType(body.transportType),
        status: parseImportStatus(body.status),
        notes: parseOptionalString(body.notes),
        warehouseId,
      },
    })

    await tx.flooringInventory.deleteMany({ where: { importEntryId: id } })

    for (const item of validatedItems) {
      await tx.flooringInventory.create({
        data: {
          importEntryId: id,
          productId: item.productId,
          itemNumber: item.itemNumber,
          dyeLot: item.dyeLot,
          stockCount: item.stockCount,
          cost: item.cost,
          freight: item.freight,
          notes: item.notes,
          locationId: item.locationId,
        },
      })
    }

    return tx.flooringImportEntry.findUniqueOrThrow({
      where: { id },
      include: importEntryInclude(),
    })
  })
}

export async function removeImportEntryIfEmpty(db: DbClient, id: string) {
  const entry = await db.flooringImportEntry.findUnique({
    where: { id },
    select: { id: true, _count: { select: { inventories: true } } },
  })

  if (!entry) {
    throw createAppError("Import not found", { status: 404 })
  }

  if (entry._count.inventories > 0) {
    throw createAppError("This import has inventory rows and cannot be deleted", { status: 409 })
  }

  await db.flooringImportEntry.delete({ where: { id } })
}

export async function listImportLocationOptions(db: DbClient = prisma) {
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
    sectionName: row.section?.name ?? null,
    warehouseName: row.warehouse.name,
  }))
}
