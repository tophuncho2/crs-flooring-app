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
  // Product's own unit FK + name/abbrev (UoM epic 2B) — seeds the new row's
  // editable unit, its picker label, and its display suffix.
  unitId: string
  unitName: string
  unitAbbrev: string
}

/**
 * Client-side draft for a staged inventory row. `clientId` doubles as the
 * local id the grid uses; for existing server rows it's the row id, for
 * new rows it's a `createLocalRecordRowId("import-staged-row")` value the
 * engine later maps to a server uuid via the diff response's `rowTempIdMap`.
 *
 * `productId` is the row's own product (staged rows attach to the import, not
 * a filter row); it + the read-only snapshots (status, productName,
 * rollPrefix, unitAbbrev) are carried so the grid renders without a join.
 * Only the 7 user-editable fields participate in the diff payload.
 */
export type ImportStagedRowDraft = {
  clientId: string
  // Editable unit FK (UoM epic 2B) — sent in the diff; `unitAbbrev` is the
  // display suffix, refreshed when the user picks a new unit.
  unitId: string
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
  productName: string
  rollPrefix: string
  unitName: string
  unitAbbrev: string
}

export function toImportStagedRowDraft(row: StagedInventoryRow): ImportStagedRowDraft {
  return {
    clientId: row.id,
    unitId: row.unitId,
    rollNumber: row.rollNumber,
    startingStock: row.startingStock,
    cost: row.cost,
    freight: row.freight,
    dyeLot: row.dyeLot,
    location: row.location,
    note: row.note,
    productId: row.productId,
    status: row.status,
    productName: row.productName,
    rollPrefix: row.rollPrefix,
    unitName: row.unitName,
    unitAbbrev: row.unitAbbrev,
  }
}

export function createImportStagedRowDraft(
  seed: StagedRowProductSeed,
): ImportStagedRowDraft {
  return {
    clientId: createLocalRecordRowId("import-staged-row"),
    unitId: seed.unitId,
    rollNumber: "",
    startingStock: "",
    cost: "",
    freight: "",
    dyeLot: "",
    location: "",
    note: "",
    productId: seed.productId,
    status: "DRAFT",
    productName: seed.productName,
    rollPrefix: "ROLL#",
    unitName: seed.unitName,
    unitAbbrev: seed.unitAbbrev,
  }
}

export function duplicateImportStagedRowDraft(
  source: ImportStagedRowDraft,
): ImportStagedRowDraft {
  return {
    clientId: createLocalRecordRowId("import-staged-row"),
    unitId: source.unitId,
    rollNumber: source.rollNumber,
    startingStock: source.startingStock,
    cost: source.cost,
    freight: source.freight,
    dyeLot: source.dyeLot,
    location: source.location,
    note: source.note,
    productId: source.productId,
    status: "DRAFT",
    productName: source.productName,
    rollPrefix: source.rollPrefix,
    unitName: source.unitName,
    unitAbbrev: source.unitAbbrev,
  }
}

export function validateImportStagedRowDrafts(
  drafts: ImportStagedRowDraft[],
): string {
  for (const [index, draft] of drafts.entries()) {
    // QUEUED rows are locked mid-import and never edited; every other state
    // (DRAFT + the now-editable IMPORTED) is validated before save.
    if (draft.status === "QUEUED") continue
    // A staged row attaches to the import via its own productId (no parent
    // filter to inherit from), so a section-level blank add must pick one
    // before it can save.
    if (!draft.productId) {
      return `Staged — row ${index + 1}: select a product.`
    }
    const issues = validateStagedInventoryForm({
      unitId: draft.unitId,
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
 * `productName` / `unitName` / `unitAbbrev` are display-only labels
 * refreshed when the user picks via ProductPicker; never enter the diff payload
 * and are never persisted (the server writes only the `unitId` FK; reads
 * re-derive the labels from the unit rel). `categoryFilterId` is UI-only:
 * a transient client-side narrowing filter for the product picker, never
 * sent in the diff and never persisted (the row's product implies its
 * category; the chip label re-derives from the product on read).
 *
 * A filter row IS a "Planned Import". Staged rows are held separately (flat,
 * keyed by their own productId) and grouped against these at render time.
 */
export type ImportFilterRowDraft = {
  clientId: string
  categoryFilterId: string | null
  productId: string
  productName: string
  // Editable unit FK (UoM epic 2B) — sent in the diff; re-seeded on product
  // change. `unitName`/`unitAbbrev` are display-only, refreshed alongside.
  unitId: string
  unitName: string
  unitAbbrev: string
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
    // Transient narrowing only — starts unset on load; the picker chip label
    // comes from the server row's product-derived categoryFilterName.
    categoryFilterId: null,
    productId: row.productId,
    productName: row.productName,
    unitId: row.unitId,
    unitName: row.unitName,
    unitAbbrev: row.unitAbbrev,
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
    unitId: "",
    unitName: "",
    unitAbbrev: "",
    stockOrdered: "",
    startingStockSum: "0.00",
    remainingStock: "",
  }
}

export function validateImportSection(state: ImportSectionLocalState): string {
  for (const [index, draft] of state.filters.entries()) {
    const filterIssues = validateStagedInventoryFilterForm({
      productId: draft.productId,
      unitId: draft.unitId,
      stockOrdered: draft.stockOrdered,
    })
    if (filterIssues.length > 0) {
      return `Planned import ${index + 1}: ${describeStagedInventoryFilterValidationIssues(filterIssues)}`
    }
  }
  return validateImportStagedRowDrafts(state.stagedRows)
}
