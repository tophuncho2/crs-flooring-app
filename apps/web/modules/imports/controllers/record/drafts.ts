import {
  validateImportPrimaryForm as domainValidateImportPrimaryForm,
  validateStagedInventoryFilterForm,
  describeStagedInventoryFilterValidationIssues,
  type ImportDetail,
  type ImportPrimaryForm,
  type StagedInventoryFilterRow,
} from "@builders/domain"

// Record-view files pass `entry` with id pointers — use ImportDetail shape.
export type ImportRecordEntry = ImportDetail

export function validateImportPrimaryForm(input: ImportPrimaryForm): string {
  const issues = domainValidateImportPrimaryForm(input)
  return issues.length > 0 ? issues[0].message : ""
}

// --- Filter-row drafts (inline editing in the section's parent grid) ---

/**
 * Client-side draft for a filter row. `clientId` doubles as the local id
 * the grid uses; for existing server rows it's the row id, for new rows
 * it's a `createLocalRecordRowId("import-filter-row")` value the engine
 * later maps to a server uuid via the diff response's `tempIdMap`.
 *
 * `productName` / `stockUnitName` / `stockUnitAbbrev` are display-only
 * snapshots refreshed when the user picks via ProductPicker; never enter
 * the diff payload (the server re-stamps them from FlooringProduct on
 * save). `categoryFilterId` IS persisted — it's a real FK column on the
 * filter row, not UI-only narrowing.
 */
export type ImportFilterRowDraft = {
  clientId: string
  categoryFilterId: string | null
  productId: string
  productName: string
  stockUnitName: string
  stockUnitAbbrev: string
  stockOrdered: string
  /**
   * Server-snapshot read-only fields carried so the parent grid can
   * render the remaining-stock + child-count columns + gate
   * remove-button / product-picker locks. Never sent in the diff.
   */
  childRowCount: number
  startingStockSum: string
  remainingStock: string
}

export function toImportFilterRowDraft(row: StagedInventoryFilterRow): ImportFilterRowDraft {
  return {
    clientId: row.id,
    categoryFilterId: row.categoryFilterId,
    productId: row.productId,
    productName: row.productName,
    stockUnitName: row.stockUnitName,
    stockUnitAbbrev: row.stockUnitAbbrev,
    stockOrdered: row.stockOrdered,
    childRowCount: row.childRowCount,
    startingStockSum: row.startingStockSum,
    remainingStock: row.remainingStock,
  }
}

export function toImportFilterRowDrafts(
  rows: StagedInventoryFilterRow[],
): ImportFilterRowDraft[] {
  return rows.map(toImportFilterRowDraft)
}

export function createImportFilterRowDraft(clientId: string): ImportFilterRowDraft {
  return {
    clientId,
    categoryFilterId: null,
    productId: "",
    productName: "",
    stockUnitName: "",
    stockUnitAbbrev: "",
    stockOrdered: "",
    childRowCount: 0,
    startingStockSum: "0.00",
    remainingStock: "",
  }
}

export function validateImportFilterRowDrafts(drafts: ImportFilterRowDraft[]): string {
  for (const [index, draft] of drafts.entries()) {
    const issues = validateStagedInventoryFilterForm({
      categoryFilterId: draft.categoryFilterId,
      productId: draft.productId,
      stockOrdered: draft.stockOrdered,
    })
    if (issues.length > 0) {
      return `Filter row ${index + 1}: ${describeStagedInventoryFilterValidationIssues(issues)}`
    }
  }
  return ""
}
