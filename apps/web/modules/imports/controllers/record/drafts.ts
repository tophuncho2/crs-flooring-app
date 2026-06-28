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

/**
 * Single reconcile payload threaded through the imports record controller.
 * Every import write (section save, mark-for-import) and the queued→imported
 * poll hand their fresh server data to `reconcileAfterWrite`, which syncs the
 * shared record's OCC token + the row arrays from this one shape. Each field
 * is optional so callers reconcile only what they have.
 */
export type ImportReconcileResponse = {
  import?: ImportDetail | null
  filterRows?: StagedInventoryFilterRow[]
  stagedRows?: StagedInventoryRow[]
}

export function validateImportPrimaryForm(input: ImportPrimaryForm): string {
  const issues = domainValidateImportPrimaryForm(input)
  return issues.length > 0 ? issues[0].message : ""
}

// --- Staged-inventory section sync helpers (shared across the section controller + components) ---

/** Server snapshot shape the staged-inventory section reconciles against. */
type SectionServerSnapshot = {
  filterRows: StagedInventoryFilterRow[]
  stagedRows: StagedInventoryRow[]
}

/**
 * Revision key for the staged-inventory section's record-scoped controller.
 * The parent import's `updatedAt` is the OCC token; row counts are tucked in so
 * a count change (add/remove, mark-for-import) flushes baselines without
 * colliding with mid-edit drafts. Status flips intentionally DON'T change the
 * key — the worker bumps a row QUEUED→IMPORTED without touching the parent, and
 * rebasing on that would clobber in-progress DRAFT edits.
 */
export function createSectionRevisionKey(
  record: ImportDetail,
  server: SectionServerSnapshot,
): string {
  return `${record.updatedAt}:${server.filterRows.length}:${server.stagedRows.length}`
}

/**
 * Live staged-row status per saved row id, sourced from the server snapshot.
 * Read-only status lives here (not in the editable draft) so the record
 * controller's queued→imported poll refreshes the badge + editability in place.
 */
export function buildServerStatusMap(
  stagedRows: StagedInventoryRow[],
): Map<string, FlooringStagedRowStatus> {
  const map = new Map<string, FlooringStagedRowStatus>()
  for (const row of stagedRows) map.set(row.id, row.status)
  return map
}

/**
 * Effective status for a staged-row draft: the live server status for saved
 * rows, else the draft's own (local-only DRAFT rows aren't in the server map
 * yet). Server always wins so a stale draft status can't mask a worker flip.
 */
export function resolveEffectiveStatus(
  serverStatusById: Map<string, FlooringStagedRowStatus>,
  draft: Pick<ImportStagedRowDraft, "clientId" | "status">,
): FlooringStagedRowStatus {
  return serverStatusById.get(draft.clientId) ?? draft.status
}

// --- Staged-row drafts (inline editing inside each filter row's expandable sub-grid) ---

/**
 * A product group's identity, used to seed a new staged-row draft. Carried so a
 * new row stamps its own productId + display snapshots (staged rows attach to
 * the import directly — there is no parent filter to inherit from).
 */
export type StagedRowProductSeed = {
  productId: string
  productName: string
  stockUnitAbbrev: string
}

/**
 * The editable fields the "Add Staged Inventory" modal collects. Cost + freight
 * are intentionally absent — the modal hides them; the draft defaults them empty
 * (the backend Decimal columns + materialize mapping stay intact).
 */
export type StagedRowFormValues = {
  rollNumber: string
  startingStock: string
  dyeLot: string
  location: string
  note: string
}

/**
 * Client-side draft for a staged inventory row. `clientId` doubles as the
 * local id the grid uses; for existing server rows it's the row id, for
 * new rows it's a `createLocalRecordRowId("import-staged-row")` value the
 * engine later maps to a server uuid via the diff response's `rowTempIdMap`.
 *
 * `productId` is the row's own product (staged rows attach to the import, not
 * a filter row); it + the read-only snapshots (status, isImported, productName,
 * rollPrefix, stockUnitAbbrev) are carried so the grid renders without a join.
 * Only the 7 user-editable fields participate in the diff payload.
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
  // Carried snapshots — productId is sent on create; the rest are display-only.
  productId: string
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
    productId: row.productId,
    status: row.status,
    isImported: row.isImported,
    productName: row.productName,
    rollPrefix: row.rollPrefix,
    stockUnitAbbrev: row.stockUnitAbbrev,
  }
}

export function createImportStagedRowDraft(
  seed: StagedRowProductSeed,
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
    productId: seed.productId,
    status: "DRAFT",
    isImported: false,
    productName: seed.productName,
    rollPrefix: "ROLL#",
    stockUnitAbbrev: seed.stockUnitAbbrev,
  }
}

/**
 * Seed a staged-row draft from the "Add Staged Inventory" modal: a product seed
 * plus the modal's editable field values. Cost + freight stay empty (the modal
 * doesn't surface them).
 */
export function createImportStagedRowDraftFromForm(
  seed: StagedRowProductSeed,
  form: StagedRowFormValues,
): ImportStagedRowDraft {
  return {
    ...createImportStagedRowDraft(seed),
    rollNumber: form.rollNumber,
    startingStock: form.startingStock,
    dyeLot: form.dyeLot,
    location: form.location,
    note: form.note,
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
    productId: source.productId,
    status: "DRAFT",
    isImported: false,
    productName: source.productName,
    rollPrefix: source.rollPrefix,
    stockUnitAbbrev: source.stockUnitAbbrev,
  }
}

export function validateImportStagedRowDrafts(
  drafts: ImportStagedRowDraft[],
): string {
  for (const [index, draft] of drafts.entries()) {
    if (draft.status !== "DRAFT") continue
    // A staged row attaches to the import via its own productId (no parent
    // filter to inherit from), so a section-level blank add must pick one
    // before it can save.
    if (!draft.productId) {
      return `Staged — row ${index + 1}: select a product.`
    }
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
      return `${draft.productName || "Staged"} — row ${index + 1}: ${describeStagedInventoryValidationIssues(issues)}`
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
 * A filter row IS a "Planned Import". Staged rows are held separately (flat,
 * keyed by their own productId) and grouped against these at render time.
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
   * Server-snapshot read-only fields carried so the grid can render the
   * remaining-stock column. Never sent in the diff.
   */
  startingStockSum: string
  remainingStock: string
}

/**
 * The staged-inventory section's full local state: the Planned Imports (filter
 * rows) and the Staged Inventory rows as two flat lists. Both slices save
 * atomically through the one section diff; the Staged Inventory view groups the
 * staged rows against the planned imports by productId at render time.
 */
export type ImportSectionLocalState = {
  filters: ImportFilterRowDraft[]
  stagedRows: ImportStagedRowDraft[]
}

export function toImportFilterRowDraft(
  row: StagedInventoryFilterRow,
): ImportFilterRowDraft {
  return {
    clientId: row.id,
    categoryFilterId: row.categoryFilterId,
    productId: row.productId,
    productName: row.productName,
    stockUnitName: row.stockUnitName,
    stockUnitAbbrev: row.stockUnitAbbrev,
    stockOrdered: row.stockOrdered,
    startingStockSum: row.startingStockSum,
    remainingStock: row.remainingStock,
  }
}

export function toImportSectionLocalState(serverValue: {
  filterRows: StagedInventoryFilterRow[]
  stagedRows: StagedInventoryRow[]
}): ImportSectionLocalState {
  return {
    filters: serverValue.filterRows.map(toImportFilterRowDraft),
    stagedRows: serverValue.stagedRows.map(toImportStagedRowDraft),
  }
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
    startingStockSum: "0.00",
    remainingStock: "",
  }
}

export function validateImportSection(state: ImportSectionLocalState): string {
  for (const [index, draft] of state.filters.entries()) {
    const filterIssues = validateStagedInventoryFilterForm({
      categoryFilterId: draft.categoryFilterId,
      productId: draft.productId,
      stockOrdered: draft.stockOrdered,
    })
    if (filterIssues.length > 0) {
      return `Planned import ${index + 1}: ${describeStagedInventoryFilterValidationIssues(filterIssues)}`
    }
  }
  return validateImportStagedRowDrafts(state.stagedRows)
}
