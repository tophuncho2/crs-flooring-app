export const IMPORT_STATUS_VALUES = ["PENDING", "FINAL"] as const

export type ImportStatus = (typeof IMPORT_STATUS_VALUES)[number]

export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  PENDING: "Pending",
  FINAL: "Final",
}

export const IMPORT_TRANSPORT_TYPE_VALUES = ["RETURN", "PURCHASE_ORDER"] as const

export type ImportTransportType = (typeof IMPORT_TRANSPORT_TYPE_VALUES)[number]

export const IMPORT_TRANSPORT_TYPE_LABELS: Record<ImportTransportType, string> = {
  RETURN: "Return",
  PURCHASE_ORDER: "Purchase Order",
}

export function isImportStatus(value: string): value is ImportStatus {
  return IMPORT_STATUS_VALUES.includes(value as ImportStatus)
}

export function isImportTransportType(value: string): value is ImportTransportType {
  return IMPORT_TRANSPORT_TYPE_VALUES.includes(value as ImportTransportType)
}

export function formatImportStatus(value: string): string {
  return isImportStatus(value) ? IMPORT_STATUS_LABELS[value] : "Pending"
}

export function formatImportTransportType(value: string): string {
  return isImportTransportType(value) ? IMPORT_TRANSPORT_TYPE_LABELS[value] : "Purchase Order"
}

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
  totalCost: number
  totalCostLabel: string
  createdAt: string
  updatedAt: string
}

export type ImportDetail = ImportRow & {
  inventories: ImportInventoryRow[]
}

export type ImportPrimaryForm = {
  orderNumber: string
  tag: string
  transportType: string
  status: string
  notes: string
  warehouseId: string
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
