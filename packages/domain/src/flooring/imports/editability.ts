/**
 * Canonical split of import-row columns by who's allowed to change them.
 * Mirrors the precedent set by `inventory/editability.ts` and
 * `cut-logs/editability.ts`.
 *
 * The warehouse-change lock (`isImportWarehouseChangeBlocked` in
 * `warehouse-rules.ts`) further restricts `warehouseId` once any staged or
 * live inventory references this import.
 */

// User-editable on the record-view primary section.
export const IMPORT_USER_EDITABLE_FIELDS = [
  "orderNumber",
  "tag",
  "notes",
  "warehouseId",
  "manufacturerId",
] as const

// Worker-only — `percent` advances atomically as the worker materializes
// staged rows into live inventory. Never accepted from user input.
export const IMPORT_WORKER_FIELDS = ["percent"] as const

// Auto-managed by Prisma / database.
export const IMPORT_AUTO_FIELDS = [
  "id",
  "importNumber",
  "createdAt",
  "updatedAt",
] as const

export type ImportUserEditableField = (typeof IMPORT_USER_EDITABLE_FIELDS)[number]
export type ImportWorkerField = (typeof IMPORT_WORKER_FIELDS)[number]
export type ImportAutoField = (typeof IMPORT_AUTO_FIELDS)[number]

export function isImportUserEditableField(field: string): field is ImportUserEditableField {
  return (IMPORT_USER_EDITABLE_FIELDS as readonly string[]).includes(field)
}

export function isImportWorkerField(field: string): field is ImportWorkerField {
  return (IMPORT_WORKER_FIELDS as readonly string[]).includes(field)
}
