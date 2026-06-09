import {
  INVENTORY_DYE_LOT_MAX,
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_NOTE_MAX,
  INVENTORY_ROLL_NUMBER_MAX,
} from "./column-limits.js"

// Default roll prefix stamped on a fresh inventory row. Mirrors the
// `flooring_inventory.roll_prefix` schema default; passed explicitly so the
// data layer can compose `inventoryItem` without re-reading a default.
export const DEFAULT_ROLL_PREFIX = "ROLL#"

// User-editable fields for the manual "create single inventory row" form. The
// product + warehouse select the snapshot/relation; the rest are free entry.
export type CreateInventoryEdits = {
  productId: string
  warehouseId: string
  rollNumber: string
  dyeLot: string
  note: string
  startingStock: string
  location: string
  internalNotes: string
}

// Product-derived snapshot columns, stamped onto the inventory row at create.
// Plain-string shape (the application maps `ProductRecord` — which normalizes
// missing units to "" — into this before calling the builder), keeping the
// domain free of `@builders/db` types.
export type CreateInventoryProductSnapshot = {
  categorySlug: string
  categoryName: string
  stockUnitName: string
  stockUnitAbbrev: string
  sendUnitName: string
  sendUnitAbbrev: string
}

export type CreatedInventoryInsertFields = {
  importEntryId: null
  sourceStagedRowId: null
  importNumber: null
  purchaseOrderNumber: null
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

export type InventoryCreateIssueCode =
  | "PRODUCT_REQUIRED"
  | "WAREHOUSE_REQUIRED"
  | "STARTING_STOCK_REQUIRED"
  | "STARTING_STOCK_INVALID"
  | "STARTING_STOCK_NOT_POSITIVE"
  | "ROLL_NUMBER_TOO_LONG"
  | "DYE_LOT_TOO_LONG"
  | "NOTE_TOO_LONG"
  | "LOCATION_TOO_LONG"
  | "INTERNAL_NOTES_TOO_LONG"

export type InventoryCreateIssue = { code: InventoryCreateIssueCode }

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export function validateCreateInventoryEdits(
  edits: CreateInventoryEdits,
): InventoryCreateIssue[] {
  const issues: InventoryCreateIssue[] = []

  if (edits.productId.trim().length === 0) {
    issues.push({ code: "PRODUCT_REQUIRED" })
  }
  if (edits.warehouseId.trim().length === 0) {
    issues.push({ code: "WAREHOUSE_REQUIRED" })
  }

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
  if (edits.dyeLot.trim().length > INVENTORY_DYE_LOT_MAX) {
    issues.push({ code: "DYE_LOT_TOO_LONG" })
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

const INVENTORY_CREATE_ISSUE_COPY: Record<InventoryCreateIssueCode, string> = {
  PRODUCT_REQUIRED: "A product is required.",
  WAREHOUSE_REQUIRED: "A warehouse is required.",
  STARTING_STOCK_REQUIRED: "Starting stock is required.",
  STARTING_STOCK_INVALID: "Starting stock must be a number.",
  STARTING_STOCK_NOT_POSITIVE: "Starting stock must be greater than zero.",
  ROLL_NUMBER_TOO_LONG: `Roll number must be ${INVENTORY_ROLL_NUMBER_MAX} characters or fewer.`,
  DYE_LOT_TOO_LONG: `Dye lot must be ${INVENTORY_DYE_LOT_MAX} characters or fewer.`,
  NOTE_TOO_LONG: `Note must be ${INVENTORY_NOTE_MAX} characters or fewer.`,
  LOCATION_TOO_LONG: `Location must be ${INVENTORY_LOCATION_MAX} characters or fewer.`,
  INTERNAL_NOTES_TOO_LONG: `Internal notes must be ${INVENTORY_INTERNAL_NOTES_MAX} characters or fewer.`,
}

export function describeInventoryCreateIssues(issues: InventoryCreateIssue[]): string {
  return issues.map((issue) => INVENTORY_CREATE_ISSUE_COPY[issue.code]).join(" ")
}

export function buildCreatedInventoryInsert(
  product: CreateInventoryProductSnapshot,
  edits: CreateInventoryEdits,
): CreatedInventoryInsertFields {
  return {
    importEntryId: null,
    sourceStagedRowId: null,
    importNumber: null,
    purchaseOrderNumber: null,
    productId: edits.productId,
    categorySlug: product.categorySlug,
    categoryName: product.categoryName,
    stockUnitName: emptyToNull(product.stockUnitName),
    stockUnitAbbrev: emptyToNull(product.stockUnitAbbrev),
    sendUnitName: emptyToNull(product.sendUnitName),
    sendUnitAbbrev: emptyToNull(product.sendUnitAbbrev),
    rollPrefix: DEFAULT_ROLL_PREFIX,
    rollNumber: emptyToNull(edits.rollNumber),
    dyeLot: emptyToNull(edits.dyeLot),
    note: emptyToNull(edits.note),
    internalNotes: emptyToNull(edits.internalNotes),
    warehouseId: edits.warehouseId,
    location: emptyToNull(edits.location),
    startingStock: edits.startingStock.trim(),
    netDeducted: "0",
    isArchived: false,
  }
}
