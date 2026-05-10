import type { ImportPrimaryForm } from "./types.js"

export type ImportValidationIssue = {
  code: "IMPORT_WAREHOUSE_REQUIRED"
  field: "warehouseId"
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

  return issues
}
