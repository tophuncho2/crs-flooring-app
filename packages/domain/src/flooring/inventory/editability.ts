export const INVENTORY_IMMUTABLE_FIELDS = [
  "startingStock",
  "cost",
  "freight",
  "importEntryId",
  "productId",
  // Unit FK (UoM epic 2B) — create-only, immutable after (replaced the four
  // frozen stock/send unit snapshot strings).
  "unitId",
  "warehouseId",
  "rollNumber",
  "dyeLot",
  "note",
] as const

export const INVENTORY_EDITABLE_FIELDS = [
  "location",
  "internalNotes",
  "isArchived",
] as const

export const INVENTORY_TRANSACTIONAL_FIELDS = ["netDeducted"] as const

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

export function buildInventoryFieldNotEditableMessage(field: string): string {
  return `Inventory field "${field}" is not user-editable.`
}
