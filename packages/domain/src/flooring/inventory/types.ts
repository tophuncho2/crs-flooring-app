export type CutLogStatus = "PENDING" | "FINAL"

export type CutLogRow = {
  id: string
  inventoryId: string
  workOrderId: string | null
  workOrderItemId: string | null
  before: string
  cut: string
  after: string
  status: CutLogStatus
  notes: string
  createdAt: string
  updatedAt: string
}

export type InventoryRow = {
  id: string
  importEntryId: string
  importNumber: string
  importTag: string
  importStatus: string
  importTransportType: string
  importWarehouseId: string
  importWarehouseName: string
  productId: string
  productName: string
  categoryId: string
  categoryName: string
  stockUnit: string
  sendUnit: string
  coveragePerUnit: string
  itemNumber: string
  dyeLot: string
  warehouseId: string
  warehouseName: string
  warehouseNumber: string
  locationId: string
  locationCode: string
  sectionNumber: string
  rafter: string
  level: string
  stockCount: string
  cost: string
  freight: string
  pricePerUnit: string
  notes: string
  isImported: boolean
  fifoReceivedAt: string
  createdAt: string
  updatedAt: string
  uncutBalance: string
  availableBalance: string
  availableCoverage: string
  awaitingCutBalance: string
  totalCutBalance: string
}

export type InventoryDetail = InventoryRow & {
  cutLogs: CutLogRow[]
}

export type InventoryForm = {
  productId: string
  warehouseId: string
  locationId: string
  itemNumber: string
  dyeLot: string
  stockCount: string
  cost: string
  freight: string
  notes: string
}

export const EMPTY_INVENTORY_FORM: InventoryForm = {
  productId: "",
  warehouseId: "",
  locationId: "",
  itemNumber: "",
  dyeLot: "",
  stockCount: "",
  cost: "",
  freight: "",
  notes: "",
}

export function toInventoryForm(row: InventoryRow): InventoryForm {
  return {
    productId: row.productId,
    warehouseId: row.warehouseId,
    locationId: row.locationId,
    itemNumber: row.itemNumber,
    dyeLot: row.dyeLot,
    stockCount: row.stockCount,
    cost: row.cost,
    freight: row.freight,
    notes: row.notes,
  }
}

export type InventoryProductOption = {
  id: string
  name: string
  label: string
  style: string | null
  color: string | null
  categoryId: string
  stockUnit: string
  sendUnit: string
  coveragePerUnit: string
}

export type InventoryWarehouseOption = {
  id: string
  name: string
  number: number
}

export type InventoryLocationOption = {
  id: string
  warehouseId: string
  locationCode: string
  sectionNumber: number | null
  warehouseName: string
}

export type InventoryCategoryOption = {
  id: string
  name: string
}

export type InventoryFormOptions = {
  products: InventoryProductOption[]
  warehouses: InventoryWarehouseOption[]
  locations: InventoryLocationOption[]
  categories: InventoryCategoryOption[]
}
