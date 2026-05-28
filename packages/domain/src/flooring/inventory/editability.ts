export const INVENTORY_IMMUTABLE_FIELDS = [
  "startingStock",
  "coveragePerUnit",
  "importEntryId",
  "productId",
  "productName",
  "categorySlug",
  "categoryName",
  "importNumber",
  "purchaseOrderNumber",
  "stockUnitName",
  "stockUnitAbbrev",
  "itemCoverageUnitName",
  "itemCoverageUnitAbbrev",
  "sendUnitName",
  "sendUnitAbbrev",
  "fifoReceivedAt",
  "warehouseId",
] as const

export const INVENTORY_EDITABLE_FIELDS = [
  "rollNumber",
  "dyeLot",
  "location",
  "note",
  "internalNotes",
  "isArchived",
] as const

export const INVENTORY_TRANSACTIONAL_FIELDS = ["totalCutSum"] as const

export type InventoryImmutableField = (typeof INVENTORY_IMMUTABLE_FIELDS)[number]
export type InventoryEditableField = (typeof INVENTORY_EDITABLE_FIELDS)[number]
export type InventoryTransactionalField = (typeof INVENTORY_TRANSACTIONAL_FIELDS)[number]

export function isInventoryFieldEditable(field: string): field is InventoryEditableField {
  return (INVENTORY_EDITABLE_FIELDS as readonly string[]).includes(field)
}

export function isInventoryFieldImmutable(field: string): field is InventoryImmutableField {
  return (INVENTORY_IMMUTABLE_FIELDS as readonly string[]).includes(field)
}

export function isInventoryFieldTransactional(field: string): field is InventoryTransactionalField {
  return (INVENTORY_TRANSACTIONAL_FIELDS as readonly string[]).includes(field)
}

import { categoryRequiresCoveragePerUnit } from "../categories/rules.js"

export function categorySupportsCoverageComputation(categorySlug: string): boolean {
  return categoryRequiresCoveragePerUnit(categorySlug)
}

export function buildInventoryFieldNotEditableMessage(field: string): string {
  return `Inventory field "${field}" is not user-editable.`
}
