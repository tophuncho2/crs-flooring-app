import {
  validateImportPrimaryForm as domainValidateImportPrimaryForm,
  type ImportDetail,
  type ImportInventoryRow,
  type ImportPrimaryForm,
  type ImportRow,
} from "@builders/domain"

// Record-view files pass `entry` with inventories attached — use ImportDetail shape.
export type ImportRecordEntry = ImportDetail

export type ProductOption = {
  id: string
  label: string
  stockUnit: string
}

export type WarehouseOption = {
  id: string
  name: string
}

export type LocationOption = {
  id: string
  warehouseId: string
  locationCode: string
  shortCode: string
  label: string
}

export type ImportInventoryRowDraft = {
  clientId: string
  productId: string
  itemNumber: string
  stockCount: string
  locationId: string
  dyeLot: string
  cost: string
  freight: string
  notes: string
  isImported: boolean
}

export function createImportInventoryRowDraft(item?: ImportInventoryRow): ImportInventoryRowDraft {
  return {
    clientId: item?.id ?? crypto.randomUUID(),
    productId: item?.productId ?? "",
    itemNumber: item?.itemNumber ?? "",
    stockCount: item?.stockCount ?? "",
    locationId: item?.locationId ?? "",
    dyeLot: item?.dyeLot ?? "",
    cost: item?.cost ?? "",
    freight: item?.freight ?? "",
    notes: item?.notes ?? "",
    isImported: item?.isImported ?? false,
  }
}

export function toImportInventoryDrafts(record: ImportRow & { inventories: ImportInventoryRow[] }) {
  return record.inventories.map((item) => createImportInventoryRowDraft(item))
}

export function applyDefaultLocationToImportRow(
  item: ImportInventoryRowDraft,
  warehouseId: string,
  locationOptions: LocationOption[],
) {
  const warehouseLocations = warehouseId
    ? locationOptions.filter((location) => location.warehouseId === warehouseId)
    : []
  const currentLocation = warehouseLocations.find((location) => location.id === item.locationId)

  if (currentLocation) {
    return item
  }

  return {
    ...item,
    locationId: "",
  }
}

export function validateImportPrimaryForm(input: ImportPrimaryForm): string {
  const issues = domainValidateImportPrimaryForm(input)
  return issues.length > 0 ? issues[0].message : ""
}

export function validateImportInventoryDrafts(items: ImportInventoryRowDraft[]) {
  for (const [index, item] of items.entries()) {
    if (!item.productId.trim()) {
      return `Row ${index + 1}: product is required.`
    }

    if (!item.stockCount.trim()) {
      return `Row ${index + 1}: stock is required.`
    }
  }

  return ""
}

export function buildImportMutationPayload(
  primary: ImportPrimaryForm,
  items: ImportInventoryRowDraft[],
) {
  return {
    orderNumber: primary.orderNumber,
    tag: primary.tag,
    transportType: primary.transportType,
    status: primary.status,
    notes: primary.notes,
    warehouseId: primary.warehouseId,
    items: items.map((item) => ({
      productId: item.productId,
      itemNumber: item.itemNumber,
      stockCount: item.stockCount,
      locationId: item.locationId || null,
      dyeLot: item.dyeLot,
      cost: item.cost,
      freight: item.freight,
      notes: item.notes,
    })),
  }
}
