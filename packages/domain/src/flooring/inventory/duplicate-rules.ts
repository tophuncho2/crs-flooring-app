import {
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_NOTE_MAX,
  INVENTORY_ROLL_NUMBER_MAX,
} from "./column-limits.js"
import type { InventoryRow } from "./types.js"

export type DuplicateInventoryEdits = {
  rollNumber: string
  note: string
  startingStock: string
  location: string
  internalNotes: string
}

export type DuplicateInventorySource = Pick<
  InventoryRow,
  | "productId"
  | "categorySlug"
  | "categoryName"
  | "stockUnitName"
  | "stockUnitAbbrev"
  | "sendUnitName"
  | "sendUnitAbbrev"
  | "rollPrefix"
  | "dyeLot"
  | "purchaseOrderNumber"
  | "warehouseId"
>

export type DuplicatedInventoryInsertFields = {
  importEntryId: null
  sourceStagedRowId: null
  importNumber: null
  purchaseOrderNumber: string | null
  productId: string
  categorySlug: string
  categoryName: string
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  sendUnitName: string | null
  sendUnitAbbrev: string | null
  rollPrefix: string
  rollNumber: string | null
  dyeLot: string | null
  note: string | null
  internalNotes: string | null
  warehouseId: string
  location: string | null
  startingStock: string
  netDeducted: "0"
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

export function buildDuplicatedInventoryInsert(
  source: DuplicateInventorySource,
  edits: DuplicateInventoryEdits,
): DuplicatedInventoryInsertFields {
  return {
    importEntryId: null,
    sourceStagedRowId: null,
    importNumber: null,
    purchaseOrderNumber: emptyToNull(source.purchaseOrderNumber),
    productId: source.productId,
    categorySlug: source.categorySlug,
    categoryName: source.categoryName,
    stockUnitName: emptyToNull(source.stockUnitName),
    stockUnitAbbrev: emptyToNull(source.stockUnitAbbrev),
    sendUnitName: emptyToNull(source.sendUnitName),
    sendUnitAbbrev: emptyToNull(source.sendUnitAbbrev),
    rollPrefix: source.rollPrefix,
    rollNumber: emptyToNull(edits.rollNumber),
    dyeLot: emptyToNull(source.dyeLot),
    note: emptyToNull(edits.note),
    internalNotes: emptyToNull(edits.internalNotes),
    warehouseId: source.warehouseId,
    location: emptyToNull(edits.location),
    startingStock: edits.startingStock.trim(),
    netDeducted: "0",
    isArchived: false,
  }
}
