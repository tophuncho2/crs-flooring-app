import type { ImportPrimaryForm } from "./types.js"

export type ImportValidationIssue = {
  code: "IMPORT_WAREHOUSE_REQUIRED"
  field: "warehouseId"
  message: string
}

/**
 * Primary-section form validator. Warehouse is the only required field —
 * orderNumber / tag / notes / manufacturer are optional. Percent is owned
 * by the worker and is never submitted from the form.
 */
export function validateImportPrimaryForm(input: ImportPrimaryForm): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = []

  if (!input.warehouseId.trim()) {
    issues.push({
      code: "IMPORT_WAREHOUSE_REQUIRED",
      field: "warehouseId",
      message: "Warehouse is required.",
    })
  }

  return issues
}
