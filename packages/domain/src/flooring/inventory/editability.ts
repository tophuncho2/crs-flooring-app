/**
 * Canonical split of inventory row columns by who's allowed to change them.
 * Keeps this invariant in one spot so the record form, the diff validator,
 * and the data-layer patch shape all agree.
 *
 * - IMMUTABLE: worker-seeded at import time; never re-edited.
 *              Includes every "numbers the cuts math depends on" column.
 * - EDITABLE:  the user can change these on the inventory record view.
 * - TRANSACTIONAL: only mutated inside a cut-log save transaction — the
 *                  cut-log use case (later sweep) writes `totalCutSum` atomically.
 */
export const INVENTORY_IMMUTABLE_FIELDS = [
  "startingStock",
  "cost",
  "freight",
  "costPerUnit",
  "freightPerUnit",
  "coveragePerUnit",
  "importEntryId",
  "productId",
  "categorySlug",
  "fifoReceivedAt",
] as const

export const INVENTORY_EDITABLE_FIELDS = [
  "itemNumber",
  "dyeLot",
  "locationId",
  "warehouseId",
  "notes",
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
