import {
  INVENTORY_ADJUSTMENT_AREA_MAX,
  INVENTORY_DYE_LOT_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_NOTE_MAX,
  INVENTORY_ROLL_NUMBER_MAX,
} from "./column-limits.js"
import { DEFAULT_ROLL_PREFIX, type CreatedInventoryInsertFields } from "./create-rules.js"

// User-editable fields for the "Create Return" form. Mirrors CreateInventoryEdits
// but drops startingStock / cost / freight / internalNotes — a return hardcodes
// startingStock "0" with null cost/freight, and internal notes are omitted from
// this form — and adds the adjustment-owned `returnedQuantity` + `area`.
export type CreateReturnEdits = {
  productId: string
  // Unit FK — seeded from the picked product on the form, overridable; frozen
  // after create. Stamped onto both the new row and its INCREASE adjustment.
  unitId: string
  warehouseId: string
  rollNumber: string
  dyeLot: string
  note: string
  // One location field feeds BOTH the new inventory row and the adjustment.
  location: string
  // Conversion trio — seeded from the picked product, editable.
  coverageUnitId: string
  coveragePerUnit: string
  conversionFormulaId: string
  // The returned amount → the INCREASE adjustment's quantity.
  returnedQuantity: string
  // Adjustment-owned free-text area label.
  area: string
}

export type ReturnCreateIssueCode =
  | "PRODUCT_REQUIRED"
  | "UNIT_REQUIRED"
  | "WAREHOUSE_REQUIRED"
  | "RETURNED_QUANTITY_REQUIRED"
  | "RETURNED_QUANTITY_INVALID"
  | "RETURNED_QUANTITY_NOT_POSITIVE"
  | "COVERAGE_PER_UNIT_INVALID"
  | "ROLL_NUMBER_TOO_LONG"
  | "DYE_LOT_TOO_LONG"
  | "NOTE_TOO_LONG"
  | "LOCATION_TOO_LONG"
  | "AREA_TOO_LONG"

export type ReturnCreateIssue = { code: ReturnCreateIssueCode }

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export function validateCreateReturnEdits(edits: CreateReturnEdits): ReturnCreateIssue[] {
  const issues: ReturnCreateIssue[] = []

  if (edits.productId.trim().length === 0) {
    issues.push({ code: "PRODUCT_REQUIRED" })
  }
  if (edits.unitId.trim().length === 0) {
    issues.push({ code: "UNIT_REQUIRED" })
  }
  if (edits.warehouseId.trim().length === 0) {
    issues.push({ code: "WAREHOUSE_REQUIRED" })
  }

  // The positive check lands on the RETURNED amount — starting stock is not user
  // input (a return hardcodes it "0"), so there is no starting-stock gate here.
  const qty = edits.returnedQuantity.trim()
  if (qty.length === 0) {
    issues.push({ code: "RETURNED_QUANTITY_REQUIRED" })
  } else {
    const parsed = Number(qty)
    if (!Number.isFinite(parsed)) {
      issues.push({ code: "RETURNED_QUANTITY_INVALID" })
    } else if (parsed <= 0) {
      issues.push({ code: "RETURNED_QUANTITY_NOT_POSITIVE" })
    }
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
  if (edits.area.trim().length > INVENTORY_ADJUSTMENT_AREA_MAX) {
    issues.push({ code: "AREA_TOO_LONG" })
  }

  return issues
}

const RETURN_CREATE_ISSUE_COPY: Record<ReturnCreateIssueCode, string> = {
  PRODUCT_REQUIRED: "A product is required.",
  UNIT_REQUIRED: "A unit is required.",
  WAREHOUSE_REQUIRED: "A warehouse is required.",
  RETURNED_QUANTITY_REQUIRED: "A returned quantity is required.",
  RETURNED_QUANTITY_INVALID: "Returned quantity must be a number.",
  RETURNED_QUANTITY_NOT_POSITIVE: "Returned quantity must be greater than zero.",
  COVERAGE_PER_UNIT_INVALID: "Coverage per unit must be a number.",
  ROLL_NUMBER_TOO_LONG: `Roll number must be ${INVENTORY_ROLL_NUMBER_MAX} characters or fewer.`,
  DYE_LOT_TOO_LONG: `Dye lot must be ${INVENTORY_DYE_LOT_MAX} characters or fewer.`,
  NOTE_TOO_LONG: `Note must be ${INVENTORY_NOTE_MAX} characters or fewer.`,
  LOCATION_TOO_LONG: `Location must be ${INVENTORY_LOCATION_MAX} characters or fewer.`,
  AREA_TOO_LONG: `Area must be ${INVENTORY_ADJUSTMENT_AREA_MAX} characters or fewer.`,
}

export function describeReturnCreateIssues(issues: ReturnCreateIssue[]): string {
  return issues.map((issue) => RETURN_CREATE_ISSUE_COPY[issue.code]).join(" ")
}

/**
 * Build the new inventory row's insert fields for a return: `startingStock`
 * hardcoded "0", `cost`/`freight`/`internalNotes` null, `netDeducted` "0".
 * Mirrors {@link buildCreatedInventoryInsert} but for the return shape. The
 * matching INCREASE adjustment (quantity = `returnedQuantity`) is assembled by
 * the application use case off the just-inserted row's parent context.
 */
export function buildReturnInventoryInsert(
  edits: CreateReturnEdits,
): CreatedInventoryInsertFields {
  return {
    importEntryId: null,
    productId: edits.productId,
    unitId: edits.unitId.trim(),
    rollPrefix: DEFAULT_ROLL_PREFIX,
    rollNumber: emptyToNull(edits.rollNumber),
    dyeLot: emptyToNull(edits.dyeLot),
    note: emptyToNull(edits.note),
    internalNotes: null,
    warehouseId: edits.warehouseId,
    location: emptyToNull(edits.location),
    startingStock: "0",
    cost: null,
    freight: null,
    coverageUnitId: emptyToNull(edits.coverageUnitId),
    coveragePerUnit: emptyToNull(edits.coveragePerUnit),
    conversionFormulaId: emptyToNull(edits.conversionFormulaId),
    netDeducted: "0",
    isArchived: false,
  }
}
