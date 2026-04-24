import {
  buildFlooringProductDisplayName,
  formatFullLocationCode,
  formatLocationRafterLevel,
} from "@builders/domain"
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

function buildLocationCode(location: StagedInventoryRowPayload["location"]): string {
  if (!location) return ""
  return formatFullLocationCode({
    warehouseNumber: location.warehouse.number,
    sectionNumber: location.section.number,
    rafter: location.rafter,
    level: location.level,
  })
}

function buildLocationShortCode(location: StagedInventoryRowPayload["location"]): string {
  if (!location) return ""
  return formatLocationRafterLevel({ rafter: location.rafter, level: location.level })
}

export function normalizeStagedInventoryRow(
  row: StagedInventoryRowPayload,
): StagedInventoryRecord {
  const location = row.location
  return {
    id: row.id,
    importEntryId: row.importEntryId,
    importNumber: String(row.importEntry.importNumber),
    productId: row.productId,
    productName: buildFlooringProductDisplayName({
      name: row.product.name,
      style: row.product.style,
      color: row.product.color,
    }),
    categoryId: row.product.category.id,
    categoryName: row.product.category.name,
    categorySlug: row.product.category.slug,
    stockUnit: row.product.category.stockUnit?.name ?? "",
    itemNumber: row.itemNumber,
    dyeLot: row.dyeLot ?? "",
    warehouseId: row.warehouseId,
    warehouseName: row.warehouse.name,
    warehouseNumber: String(row.warehouse.number),
    locationId: row.locationId ?? "",
    locationCode: buildLocationCode(location),
    locationShortCode: buildLocationShortCode(location),
    sectionNumber: location?.section ? String(location.section.number) : "",
    rafter: location ? String(location.rafter) : "",
    level: location ? String(location.level) : "",
    startingStock: toDecimalString(row.startingStock),
    isImported: row.isImported,
    cost: toDecimalString(row.cost),
    freight: toDecimalString(row.freight),
    notes: row.notes ?? "",
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
