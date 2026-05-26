import {
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_NOTE_MAX,
  INVENTORY_ROLL_NUMBER_MAX,
} from "./column-limits.js"
import type { InventoryRow } from "./types.js"

/**
 * Editable fields the user supplies when duplicating an inventory item.
 * `rollNumber` / `note` / `startingStock` are pre-filled from the source row
 * (then editable); `location` / `internalNotes` start blank. Everything else
 * on the row is pasted verbatim, server-set, or DB-generated — see
 * `buildDuplicatedInventoryInsert`.
 */
export type DuplicateInventoryEdits = {
  rollNumber: string
  note: string
  startingStock: string
  location: string
  internalNotes: string
}

/** Source columns pasted verbatim from the row being duplicated. */
export type DuplicateInventorySource = Pick<
  InventoryRow,
  | "productId"
  | "productName"
  | "categorySlug"
  | "categoryName"
  | "stockUnitName"
  | "stockUnitAbbrev"
  | "itemCoverageUnitName"
  | "itemCoverageUnitAbbrev"
  | "sendUnitName"
  | "sendUnitAbbrev"
  | "coveragePerUnit"
  | "rollPrefix"
  | "dyeLot"
  | "warehouseId"
>

/**
 * Column values for inserting a duplicated inventory row. Excludes the
 * DB/data-managed columns: `id`, `inventoryNumber`, `inventoryNumberInt`,
 * `inventoryItem` (composed post-insert once the sequence assigns the
 * number), `fifoReceivedAt` (server stamps `now()`), `createdAt`,
 * `updatedAt`. Import provenance is explicitly dropped (all null) and the
 * row starts un-cut + un-archived.
 */
export type DuplicatedInventoryInsertFields = {
  importEntryId: null
  sourceStagedRowId: null
  importNumber: null
  purchaseOrderNumber: null
  productId: string
  productName: string
  categorySlug: string
  categoryName: string
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  itemCoverageUnitName: string | null
  itemCoverageUnitAbbrev: string | null
  sendUnitName: string | null
  sendUnitAbbrev: string | null
  coveragePerUnit: string | null
  rollPrefix: string
  rollNumber: string | null
  dyeLot: string | null
  note: string | null
  internalNotes: string | null
  warehouseId: string
  location: string | null
  startingStock: string
  totalCutSum: "0"
  isArchived: false
}

export type InventoryDuplicateIssueCode =
  | "STARTING_STOCK_REQUIRED"
  | "STARTING_STOCK_INVALID"
  | "STARTING_STOCK_NOT_POSITIVE"
  | "ROLL_NUMBER_TOO_LONG"
  | "NOTE_TOO_LONG"
  | "LOCATION_TOO_LONG"
  | "INTERNAL_NOTES_TOO_LONG"

export type InventoryDuplicateIssue = { code: InventoryDuplicateIssueCode }

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

/**
 * Validates the user-supplied editable fields for an inventory duplicate.
 * `startingStock` is required and must parse to a positive number; the short
 * free-text fields must fit their `@db.VarChar` limits (the schema caps, not
 * the looser UI-cell maxes). `dyeLot` is pasted (not editable) so it isn't
 * validated here. Returns an empty array when the edits are valid.
 */
export function validateDuplicateInventoryEdits(
  edits: DuplicateInventoryEdits,
): InventoryDuplicateIssue[] {
  const issues: InventoryDuplicateIssue[] = []

  const stock = edits.startingStock.trim()
  if (stock.length === 0) {
    issues.push({ code: "STARTING_STOCK_REQUIRED" })
  } else {
    const parsed = Number(stock)
    if (!Number.isFinite(parsed)) {
      issues.push({ code: "STARTING_STOCK_INVALID" })
    } else if (parsed <= 0) {
      issues.push({ code: "STARTING_STOCK_NOT_POSITIVE" })
    }
  }

  if (edits.rollNumber.trim().length > INVENTORY_ROLL_NUMBER_MAX) {
    issues.push({ code: "ROLL_NUMBER_TOO_LONG" })
  }
  if (edits.note.trim().length > INVENTORY_NOTE_MAX) {
    issues.push({ code: "NOTE_TOO_LONG" })
  }
  if (edits.location.trim().length > INVENTORY_LOCATION_MAX) {
    issues.push({ code: "LOCATION_TOO_LONG" })
  }
  if (edits.internalNotes.trim().length > INVENTORY_INTERNAL_NOTES_MAX) {
    issues.push({ code: "INTERNAL_NOTES_TOO_LONG" })
  }

  return issues
}

const INVENTORY_DUPLICATE_ISSUE_COPY: Record<InventoryDuplicateIssueCode, string> = {
  STARTING_STOCK_REQUIRED: "Starting stock is required.",
  STARTING_STOCK_INVALID: "Starting stock must be a number.",
  STARTING_STOCK_NOT_POSITIVE: "Starting stock must be greater than zero.",
  ROLL_NUMBER_TOO_LONG: `Roll number must be ${INVENTORY_ROLL_NUMBER_MAX} characters or fewer.`,
  NOTE_TOO_LONG: `Note must be ${INVENTORY_NOTE_MAX} characters or fewer.`,
  LOCATION_TOO_LONG: `Location must be ${INVENTORY_LOCATION_MAX} characters or fewer.`,
  INTERNAL_NOTES_TOO_LONG: `Internal notes must be ${INVENTORY_INTERNAL_NOTES_MAX} characters or fewer.`,
}

export function describeInventoryDuplicateIssues(issues: InventoryDuplicateIssue[]): string {
  return issues.map((issue) => INVENTORY_DUPLICATE_ISSUE_COPY[issue.code]).join(" ")
}

/**
 * Builds the insert payload for a duplicated inventory row. Pastes identity +
 * UoM + product/category snapshot + warehouse + dye lot from the source;
 * applies the user's editable fields (roll# / note / starting stock /
 * location / internal notes); drops all import provenance (null); and starts
 * the row un-cut (`totalCutSum: "0"`) and active (`isArchived: false`). Empty
 * short-text fields normalize to null per the nullable columns. Assumes
 * `edits` already passed `validateDuplicateInventoryEdits`.
 */
export function buildDuplicatedInventoryInsert(
  source: DuplicateInventorySource,
  edits: DuplicateInventoryEdits,
): DuplicatedInventoryInsertFields {
  return {
    importEntryId: null,
    sourceStagedRowId: null,
    importNumber: null,
    purchaseOrderNumber: null,
    productId: source.productId,
    productName: source.productName,
    categorySlug: source.categorySlug,
    categoryName: source.categoryName,
    stockUnitName: emptyToNull(source.stockUnitName),
    stockUnitAbbrev: emptyToNull(source.stockUnitAbbrev),
    itemCoverageUnitName: emptyToNull(source.itemCoverageUnitName),
    itemCoverageUnitAbbrev: emptyToNull(source.itemCoverageUnitAbbrev),
    sendUnitName: emptyToNull(source.sendUnitName),
    sendUnitAbbrev: emptyToNull(source.sendUnitAbbrev),
    coveragePerUnit: emptyToNull(source.coveragePerUnit),
    rollPrefix: source.rollPrefix,
    rollNumber: emptyToNull(edits.rollNumber),
    dyeLot: emptyToNull(source.dyeLot),
    note: emptyToNull(edits.note),
    internalNotes: emptyToNull(edits.internalNotes),
    warehouseId: source.warehouseId,
    location: emptyToNull(edits.location),
    startingStock: edits.startingStock.trim(),
    totalCutSum: "0",
    isArchived: false,
  }
}
