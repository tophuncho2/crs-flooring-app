export type ImportInventoryRow = {
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
}

export type ImportRow = {
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
  createdAt: string
  updatedAt: string
  inventories: ImportInventoryRow[]
}

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
  label: string
}

export type ImportPrimaryForm = {
  orderNumber: string
  tag: string
  transportType: string
  status: string
  notes: string
  warehouseId: string
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
}

export const EMPTY_IMPORT_PRIMARY_FORM: ImportPrimaryForm = {
  orderNumber: "",
  tag: "",
  transportType: "PURCHASE_ORDER",
  status: "PENDING",
  notes: "",
  warehouseId: "",
}

export function toImportPrimaryForm(record: ImportRow): ImportPrimaryForm {
  return {
    orderNumber: record.orderNumber,
    tag: record.tag,
    transportType: record.transportType,
    status: record.status,
    notes: record.notes,
    warehouseId: record.warehouseId,
  }
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
  }
}

export function toImportInventoryDrafts(record: ImportRow) {
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

export function validateImportPrimaryForm(input: ImportPrimaryForm) {
  if (!input.warehouseId.trim()) {
    return "Select a warehouse before saving the import."
  }

  return ""
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
