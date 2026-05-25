import type { StagedInventoryForm } from "./types.js"
import {
  STAGED_INVENTORY_ROW_DYE_LOT_MAX,
  STAGED_INVENTORY_ROW_LOCATION_MAX,
  STAGED_INVENTORY_ROW_NOTE_MAX,
  STAGED_INVENTORY_ROW_ROLL_NUMBER_MAX,
} from "./column-limits.js"

export type StagedInventoryValidationIssue =
  | { code: "STAGED_STARTING_STOCK_INVALID"; value: string }
  | { code: "STAGED_STARTING_STOCK_NEGATIVE"; value: string }
  | { code: "STAGED_ROLL_NUMBER_TOO_LONG"; value: string }
  | { code: "STAGED_DYE_LOT_TOO_LONG"; value: string }
  | { code: "STAGED_LOCATION_TOO_LONG"; value: string }
  | { code: "STAGED_NOTE_TOO_LONG"; value: string }

/**
 * Per-row form validator for a staged inventory row. The form covers
 * only user-editable fields — product/warehouse/stockUnit are
 * parent-owned snapshots stamped on create and never appear here.
 */
export function validateStagedInventoryForm(
  input: StagedInventoryForm,
): StagedInventoryValidationIssue[] {
  const issues: StagedInventoryValidationIssue[] = []

  const raw = input.startingStock.trim()
  if (raw.length === 0 || !Number.isFinite(Number(raw))) {
    issues.push({ code: "STAGED_STARTING_STOCK_INVALID", value: input.startingStock })
  } else if (Number(raw) < 0) {
    issues.push({ code: "STAGED_STARTING_STOCK_NEGATIVE", value: input.startingStock })
  }

  if (input.rollNumber.length > STAGED_INVENTORY_ROW_ROLL_NUMBER_MAX) {
    issues.push({ code: "STAGED_ROLL_NUMBER_TOO_LONG", value: input.rollNumber })
  }
  if (input.dyeLot.length > STAGED_INVENTORY_ROW_DYE_LOT_MAX) {
    issues.push({ code: "STAGED_DYE_LOT_TOO_LONG", value: input.dyeLot })
  }
  if (input.location.length > STAGED_INVENTORY_ROW_LOCATION_MAX) {
    issues.push({ code: "STAGED_LOCATION_TOO_LONG", value: input.location })
  }
  if (input.note.length > STAGED_INVENTORY_ROW_NOTE_MAX) {
    issues.push({ code: "STAGED_NOTE_TOO_LONG", value: input.note })
  }

  return issues
}

export function describeStagedInventoryValidationIssue(
  issue: StagedInventoryValidationIssue,
): string {
  switch (issue.code) {
    case "STAGED_STARTING_STOCK_INVALID":
      return "Starting stock must be a number."
    case "STAGED_STARTING_STOCK_NEGATIVE":
      return "Starting stock cannot be negative."
    case "STAGED_ROLL_NUMBER_TOO_LONG":
      return `Roll number must be ${STAGED_INVENTORY_ROW_ROLL_NUMBER_MAX} characters or fewer.`
    case "STAGED_DYE_LOT_TOO_LONG":
      return `Dye lot must be ${STAGED_INVENTORY_ROW_DYE_LOT_MAX} characters or fewer.`
    case "STAGED_LOCATION_TOO_LONG":
      return `Location must be ${STAGED_INVENTORY_ROW_LOCATION_MAX} characters or fewer.`
    case "STAGED_NOTE_TOO_LONG":
      return `Note must be ${STAGED_INVENTORY_ROW_NOTE_MAX} characters or fewer.`
  }
}

export function describeStagedInventoryValidationIssues(
  issues: StagedInventoryValidationIssue[],
): string {
  return issues.map(describeStagedInventoryValidationIssue).join(" ")
}
