import type { ImportPrimaryForm } from "./types.js"
import { IMPORT_INTERNAL_NOTES_MAX, IMPORT_PURCHASE_ORDER_NUMBER_MAX } from "./column-limits.js"

export type ImportValidationIssue =
  | {
      code: "IMPORT_WAREHOUSE_REQUIRED"
      field: "warehouseId"
      message: string
    }
  | {
      code: "IMPORT_PURCHASE_ORDER_NUMBER_TOO_LONG"
      field: "purchaseOrderNumber"
      message: string
    }
  | {
      code: "IMPORT_INTERNAL_NOTES_TOO_LONG"
      field: "internalNotes"
      message: string
    }

export function validateImportPrimaryForm(input: ImportPrimaryForm): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = []

  if (!input.warehouseId.trim()) {
    issues.push({
      code: "IMPORT_WAREHOUSE_REQUIRED",
      field: "warehouseId",
      message: "Warehouse is required.",
    })
  }

  if (input.purchaseOrderNumber.length > IMPORT_PURCHASE_ORDER_NUMBER_MAX) {
    issues.push({
      code: "IMPORT_PURCHASE_ORDER_NUMBER_TOO_LONG",
      field: "purchaseOrderNumber",
      message: `Purchase order number must be ${IMPORT_PURCHASE_ORDER_NUMBER_MAX} characters or fewer.`,
    })
  }

  if (input.internalNotes.length > IMPORT_INTERNAL_NOTES_MAX) {
    issues.push({
      code: "IMPORT_INTERNAL_NOTES_TOO_LONG",
      field: "internalNotes",
      message: `Internal notes must be ${IMPORT_INTERNAL_NOTES_MAX} characters or fewer.`,
    })
  }

  return issues
}
