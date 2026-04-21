import {
  isImportStatus,
  isImportTransportType,
  type ImportPrimaryForm,
} from "./types.js"

export type ImportValidationIssue =
  | { code: "IMPORT_WAREHOUSE_REQUIRED"; message: string; field: "warehouseId" }
  | { code: "IMPORT_STATUS_INVALID"; message: string; field: "status" }
  | { code: "IMPORT_TRANSPORT_TYPE_INVALID"; message: string; field: "transportType" }

export function validateImportPrimaryForm(input: ImportPrimaryForm): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = []

  if (!input.warehouseId.trim()) {
    issues.push({
      code: "IMPORT_WAREHOUSE_REQUIRED",
      message: "Select a warehouse before saving the import.",
      field: "warehouseId",
    })
  }

  if (!isImportStatus(input.status)) {
    issues.push({
      code: "IMPORT_STATUS_INVALID",
      message: "Import status must be Pending or Final.",
      field: "status",
    })
  }

  if (!isImportTransportType(input.transportType)) {
    issues.push({
      code: "IMPORT_TRANSPORT_TYPE_INVALID",
      message: "Transport type must be Return or Purchase Order.",
      field: "transportType",
    })
  }

  return issues
}

export type ImportDeleteLinkState = {
  hasInventory: boolean
}

export function isImportDeleteBlocked(state: ImportDeleteLinkState): boolean {
  return state.hasInventory
}

export function buildImportDeleteBlockedMessage(state: ImportDeleteLinkState): string {
  if (state.hasInventory) {
    return "This import has inventory rows linked to it and cannot be deleted."
  }
  return ""
}
