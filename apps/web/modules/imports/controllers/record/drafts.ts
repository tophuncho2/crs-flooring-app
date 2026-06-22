import {
  validateImportPrimaryForm as domainValidateImportPrimaryForm,
  validateStagedInventoryFilterForm,
  validateStagedInventoryForm,
  describeStagedInventoryFilterValidationIssues,
  describeStagedInventoryValidationIssues,
  type FlooringStagedRowStatus,
  type ImportDetail,
  type ImportPrimaryForm,
  type StagedInventoryFilterRow,
  type StagedInventoryRow,
} from "@builders/domain"
import { createLocalRecordRowId } from "@/engines/record-view"

// Record-view files pass `entry` with id pointers — use ImportDetail shape.
export type ImportRecordEntry = ImportDetail

export function validateImportPrimaryForm(input: ImportPrimaryForm): string {
  const issues = domainValidateImportPrimaryForm(input)
  return issues.length > 0 ? issues[0].message : ""
}

// --- Staged-row drafts (inline editing inside each filter row's expandable sub-grid) ---

/**
 * Client-side draft for a staged inventory row. `clientId` doubles as the
 * local id the sub-grid uses; for existing server rows it's the row id, for
 * new rows it's a `createLocalRecordRowId("import-staged-row")` value the
 * engine later maps to a server uuid via the diff response's `rowTempIdMap`.
 *
 * Only the 5 user-editable fields participate in the diff payload. The
 * read-only fields (status, isImported, productName, rollPrefix,
 * stockUnitAbbrev) are snapshots carried so the sub-grid can render them
 * without a parent join.
 */
export type ImportStagedRowDraft = {
  clientId: string
  rollNumber: string
  startingStock: string
  cost: string
  freight: string
  dyeLot: string
  location: string
  note: string
  // Read-only snapshots — never enter the diff payload.
  status: FlooringStagedRowStatus
  isImported: boolean
  productName: string
  rollPrefix: string
  stockUnitAbbrev: string
}

export function toImportStagedRowDraft(row: StagedInventoryRow): ImportStagedRowDraft {
  return {
    clientId: row.id,
    rollNumber: row.rollNumber,
    startingStock: row.startingStock,
    cost: row.cost,
    freight: row.freight,
    dyeLot: row.dyeLot,
    location: row.location,
    note: row.note,
    status: row.status,
    isImported: row.isImported,
    productName: row.productName,
    rollPrefix: row.rollPrefix,
    stockUnitAbbrev: row.stockUnitAbbrev,
  }
}

export function createImportStagedRowDraft(
  filter: Pick<ImportFilterRowDraft, "productName" | "stockUnitAbbrev">,
): ImportStagedRowDraft {
  return {
    clientId: createLocalRecordRowId("import-staged-row"),
    rollNumber: "",
    startingStock: "",
    cost: "",
    freight: "",
    dyeLot: "",
    location: "",
    note: "",
    status: "DRAFT",
    isImported: false,
    productName: filter.productName,
    rollPrefix: "ROLL#",
    stockUnitAbbrev: filter.stockUnitAbbrev,
  }
}

export function duplicateImportStagedRowDraft(
  source: ImportStagedRowDraft,
): ImportStagedRowDraft {
  return {
    clientId: createLocalRecordRowId("import-staged-row"),
    rollNumber: source.rollNumber,
    startingStock: source.startingStock,
    cost: source.cost,
    freight: source.freight,
    dyeLot: source.dyeLot,
    location: source.location,
    note: source.note,
    status: "DRAFT",
    isImported: false,
    productName: source.productName,
    rollPrefix: source.rollPrefix,
    stockUnitAbbrev: source.stockUnitAbbrev,
  }
}

export function validateImportStagedRowDrafts(
  drafts: ImportStagedRowDraft[],
  filterRowLabel: string,
): string {
  for (const [index, draft] of drafts.entries()) {
    if (draft.status !== "DRAFT") continue
    const issues = validateStagedInventoryForm({
      rollNumber: draft.rollNumber,
      startingStock: draft.startingStock,
      cost: draft.cost,
      freight: draft.freight,
      dyeLot: draft.dyeLot,
      location: draft.location,
      note: draft.note,
    })
    if (issues.length > 0) {
      return `${filterRowLabel} — row ${index + 1}: ${describeStagedInventoryValidationIssues(issues)}`
    }
  }
  return ""
}

// --- Filter-row drafts (inline editing in the section's parent grid) ---

/**
 * Client-side draft for a filter row. `clientId` doubles as the local id
 * the grid uses; for existing server rows it's the row id, for new rows
 * it's a `createLocalRecordRowId("import-filter-row")` value the engine
 * later maps to a server uuid via the diff response's `filterTempIdMap`.
 *
 * `productName` / `stockUnitName` / `stockUnitAbbrev` are display-only
 * snapshots refreshed when the user picks via ProductPicker; never enter
 * the diff payload (the server re-stamps them from FlooringProduct on
 * save). `categoryFilterId` IS persisted — it's a real FK column on the
 * filter row, not UI-only narrowing.
 *
 * `stagedRows` is the nested list of staged-row drafts belonging to this
 * filter row. The combined section diff is built by walking both layers.
 * Per the unsaved-parent rule, `stagedRows` is only populated for filter
 * rows that exist on the server — local-only filter drafts always have
 * an empty `stagedRows` list (the sub-grid is gated behind a saved
 * parent at the component layer).
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
  stagedRows: ImportStagedRowDraft[]
}

export function toImportFilterRowDraft(
  row: StagedInventoryFilterRow,
  stagedRows: StagedInventoryRow[] = [],
): ImportFilterRowDraft {
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
    stagedRows: stagedRows.map(toImportStagedRowDraft),
  }
}

export function toImportFilterRowDrafts(serverValue: {
  filterRows: StagedInventoryFilterRow[]
  stagedRows: StagedInventoryRow[]
}): ImportFilterRowDraft[] {
  const stagedByFilterId = new Map<string, StagedInventoryRow[]>()
  for (const row of serverValue.stagedRows) {
    const list = stagedByFilterId.get(row.filterRowId) ?? []
    list.push(row)
    stagedByFilterId.set(row.filterRowId, list)
  }
  return serverValue.filterRows.map((filter) =>
    toImportFilterRowDraft(filter, stagedByFilterId.get(filter.id) ?? []),
  )
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
    stagedRows: [],
  }
}

export function validateImportFilterRowDrafts(drafts: ImportFilterRowDraft[]): string {
  for (const [index, draft] of drafts.entries()) {
    const filterIssues = validateStagedInventoryFilterForm({
      categoryFilterId: draft.categoryFilterId,
      productId: draft.productId,
      stockOrdered: draft.stockOrdered,
    })
    if (filterIssues.length > 0) {
      return `Filter row ${index + 1}: ${describeStagedInventoryFilterValidationIssues(filterIssues)}`
    }
    const stagedIssue = validateImportStagedRowDrafts(
      draft.stagedRows,
      `Filter row ${index + 1}`,
    )
    if (stagedIssue) return stagedIssue
  }
  return ""
}
