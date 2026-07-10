// The identity triple (product, warehouse, unit) is create-only — an indicator is
// defined by which stock it tracks, so re-pointing it would silently change what
// the tracker means. Everything else is freely editable.

export const INVENTORY_INDICATOR_IMMUTABLE_FIELDS = [
  "productId",
  "warehouseId",
  "unitId",
] as const

export const INVENTORY_INDICATOR_EDITABLE_FIELDS = [
  "lowStockThreshold",
  "internalNotes",
  "isActive",
] as const

export type InventoryIndicatorImmutableField =
  (typeof INVENTORY_INDICATOR_IMMUTABLE_FIELDS)[number]
export type InventoryIndicatorEditableField =
  (typeof INVENTORY_INDICATOR_EDITABLE_FIELDS)[number]

export function isInventoryIndicatorFieldEditable(
  field: string,
): field is InventoryIndicatorEditableField {
  return (INVENTORY_INDICATOR_EDITABLE_FIELDS as readonly string[]).includes(field)
}

export function isInventoryIndicatorFieldImmutable(
  field: string,
): field is InventoryIndicatorImmutableField {
  return (INVENTORY_INDICATOR_IMMUTABLE_FIELDS as readonly string[]).includes(field)
}

export function buildInventoryIndicatorFieldNotEditableMessage(field: string): string {
  return `Inventory indicator field "${field}" is not user-editable.`
}
