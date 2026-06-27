export const IMPORT_USER_EDITABLE_FIELDS = [
  "purchaseOrderNumber",
  "internalNotes",
  "warehouseId",
  "manufacturerId",
  "color",
] as const

export const IMPORT_AUTO_FIELDS = [
  "id",
  "importNumber",
  "createdAt",
  "updatedAt",
] as const

export type ImportUserEditableField = (typeof IMPORT_USER_EDITABLE_FIELDS)[number]
export type ImportAutoField = (typeof IMPORT_AUTO_FIELDS)[number]

export function isImportUserEditableField(field: string): field is ImportUserEditableField {
  return (IMPORT_USER_EDITABLE_FIELDS as readonly string[]).includes(field)
}
