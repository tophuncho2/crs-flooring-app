import { isValidMoneyAmount, normalizeMoneyAmount } from "../shared/money.js"
import {
  INVENTORY_DYE_LOT_MAX,
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_NOTE_MAX,
  INVENTORY_ROLL_NUMBER_MAX,
} from "./column-limits.js"

// Default roll prefix stamped on a fresh inventory row. Mirrors the
// `flooring_inventory.roll_prefix` schema default; passed explicitly so the
// data layer doesn't re-read a default.
export const DEFAULT_ROLL_PREFIX = "ROLL#"

// User-editable fields for the manual "create single inventory row" form. The
// product + warehouse select the snapshot/relation; the rest are free entry.
export type CreateInventoryEdits = {
  productId: string
  // Unit FK (UoM epic 2B). Seeded from the picked product on the create form,
  // user-overridable; frozen after create.
  unitId: string
  warehouseId: string
  rollNumber: string
  dyeLot: string
  note: string
  startingStock: string
  cost: string
  freight: string
  location: string
  internalNotes: string
  // Conversion feature — seeded from the picked product, user-overridable,
  // editable after create. FKs are unguarded (DB RESTRICT is the backstop).
  coverageUnitId: string
  coveragePerUnit: string
  conversionFormulaId: string
}

export type CreatedInventoryInsertFields = {
  importEntryId: null
  productId: string
  unitId: string
  rollPrefix: string
  rollNumber: string | null
  dyeLot: string | null
  note: string | null
  internalNotes: string | null
  warehouseId: string
  location: string | null
  startingStock: string
  cost: string | null
  freight: string | null
  coverageUnitId: string | null
  coveragePerUnit: string | null
  conversionFormulaId: string | null
  netDeducted: "0"
  isArchived: false
}

export type InventoryCreateIssueCode =
  | "PRODUCT_REQUIRED"
  | "UNIT_REQUIRED"
  | "WAREHOUSE_REQUIRED"
  | "STARTING_STOCK_REQUIRED"
  | "STARTING_STOCK_INVALID"
  | "STARTING_STOCK_NOT_POSITIVE"
  | "COST_INVALID"
  | "FREIGHT_INVALID"
  | "COVERAGE_PER_UNIT_INVALID"
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
  if (edits.unitId.trim().length === 0) {
    issues.push({ code: "UNIT_REQUIRED" })
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

  // Cost/freight are optional money figures — only validated when present.
  const cost = edits.cost.trim()
  if (cost.length > 0 && !isValidMoneyAmount(cost)) {
    issues.push({ code: "COST_INVALID" })
  }
  const freight = edits.freight.trim()
  if (freight.length > 0 && !isValidMoneyAmount(freight)) {
    issues.push({ code: "FREIGHT_INVALID" })
  }

  // coveragePerUnit is a plain decimal (not money) — only validated when present.
  const coveragePerUnit = edits.coveragePerUnit.trim()
  if (coveragePerUnit.length > 0 && !Number.isFinite(Number(coveragePerUnit))) {
    issues.push({ code: "COVERAGE_PER_UNIT_INVALID" })
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
  UNIT_REQUIRED: "A unit is required.",
  WAREHOUSE_REQUIRED: "A warehouse is required.",
  STARTING_STOCK_REQUIRED: "Starting stock is required.",
  STARTING_STOCK_INVALID: "Starting stock must be a number.",
  STARTING_STOCK_NOT_POSITIVE: "Starting stock must be greater than zero.",
  COST_INVALID: "Cost must be a valid dollar amount.",
  FREIGHT_INVALID: "Freight must be a valid dollar amount.",
  COVERAGE_PER_UNIT_INVALID: "Coverage per unit must be a number.",
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
  edits: CreateInventoryEdits,
): CreatedInventoryInsertFields {
  return {
    importEntryId: null,
    productId: edits.productId,
    unitId: edits.unitId.trim(),
    rollPrefix: DEFAULT_ROLL_PREFIX,
    rollNumber: emptyToNull(edits.rollNumber),
    dyeLot: emptyToNull(edits.dyeLot),
    note: emptyToNull(edits.note),
    internalNotes: emptyToNull(edits.internalNotes),
    warehouseId: edits.warehouseId,
    location: emptyToNull(edits.location),
    startingStock: edits.startingStock.trim(),
    cost: edits.cost.trim() === "" ? null : normalizeMoneyAmount(edits.cost),
    freight: edits.freight.trim() === "" ? null : normalizeMoneyAmount(edits.freight),
    // Raw-trimmed decimal (not money-normalized) to avoid trailing-zero dirty
    // flips; FKs pass through untouched (DB RESTRICT backstops existence).
    coverageUnitId: emptyToNull(edits.coverageUnitId),
    coveragePerUnit: emptyToNull(edits.coveragePerUnit),
    conversionFormulaId: emptyToNull(edits.conversionFormulaId),
    netDeducted: "0",
    isArchived: false,
  }
}
