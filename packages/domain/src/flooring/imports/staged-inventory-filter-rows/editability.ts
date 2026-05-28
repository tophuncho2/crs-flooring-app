export function hasChildren(row: { childRowCount: number }): boolean {
  return row.childRowCount > 0
}

export function canDeleteFilterRow(row: { childRowCount: number }): boolean {
  return !hasChildren(row)
}

export function canEditFilterProduct(row: { childRowCount: number }): boolean {
  return !hasChildren(row)
}

export function buildFilterProductLockedMessage(): string {
  return "Filter row product can't change once staged inventory rows reference it."
}

export function buildFilterDeleteBlockedMessage(): string {
  return "Delete the staged inventory rows under this filter before removing it."
}

export const FILTER_USER_EDITABLE_FIELDS = [
  "categoryFilterId",
  "productId",
  "stockOrdered",
] as const

export const FILTER_PARENT_OWNED_FIELDS = [
  "stockUnitName",
  "stockUnitAbbrev",
] as const

export const FILTER_AUTO_FIELDS = [
  "id",
  "importEntryId",
  "createdAt",
  "updatedAt",
] as const

export type FilterUserEditableField = (typeof FILTER_USER_EDITABLE_FIELDS)[number]
export type FilterParentOwnedField = (typeof FILTER_PARENT_OWNED_FIELDS)[number]
export type FilterAutoField = (typeof FILTER_AUTO_FIELDS)[number]

export function isFilterUserEditableField(field: string): field is FilterUserEditableField {
  return (FILTER_USER_EDITABLE_FIELDS as readonly string[]).includes(field)
}
