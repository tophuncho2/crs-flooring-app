import {
  validateImportPrimaryForm as domainValidateImportPrimaryForm,
  type ImportDetail,
  type ImportPrimaryForm,
  type StagedInventoryRow,
} from "@builders/domain"

// Record-view files pass `entry` with id pointers — use ImportDetail shape.
export type ImportRecordEntry = ImportDetail

export type WarehouseOption = {
  id: string
  name: string
}

export type ManufacturerOption = {
  id: string
  label: string
}

export type LocationOption = {
  id: string
  warehouseId: string
  locationCode: string
  shortCode: string
  label: string
}

export type ImportStagedRowDraft = {
  clientId: string
  productId: string
  itemNumber: string
  startingStock: string
  locationId: string
  dyeLot: string
  notes: string
  /**
   * Client-only helper: scopes the product dropdown to products matching this
   * category. `null` = show all products. Not persisted — never appears in the
   * mutation payload. Surviving across re-renders via the draft state is
   * enough.
   */
  categoryFilterId: string | null
}

export function createImportStagedRowDraft(item?: StagedInventoryRow): ImportStagedRowDraft {
  return {
    clientId: item?.id ?? crypto.randomUUID(),
    productId: item?.productId ?? "",
    itemNumber: item?.itemNumber ?? "",
    startingStock: item?.startingStock ?? "",
    locationId: item?.locationId ?? "",
    dyeLot: item?.dyeLot ?? "",
    notes: item?.notes ?? "",
    categoryFilterId: null,
  }
}

export function toImportStagedRowDrafts(rows: StagedInventoryRow[]): ImportStagedRowDraft[] {
  return rows.map((row) => createImportStagedRowDraft(row))
}

export function applyDefaultLocationToImportRow(
  item: ImportStagedRowDraft,
  warehouseId: string,
  locationOptions: LocationOption[],
): ImportStagedRowDraft {
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

export function validateImportStagedRowDrafts(items: ImportStagedRowDraft[]) {
  for (const [index, item] of items.entries()) {
    if (!item.productId.trim()) {
      return `Row ${index + 1}: product is required.`
    }

    if (!item.startingStock.trim()) {
      return `Row ${index + 1}: starting stock is required.`
    }
  }

  return ""
}
