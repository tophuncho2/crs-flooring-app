import type { StagedInventoryForm } from "./types.js"

export type StagedInventoryValidationIssue =
  | { code: "STAGED_STARTING_STOCK_INVALID"; value: string }
  | { code: "STAGED_STARTING_STOCK_NEGATIVE"; value: string }

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
  }
}

export function describeStagedInventoryValidationIssues(
  issues: StagedInventoryValidationIssue[],
): string {
  return issues.map(describeStagedInventoryValidationIssue).join(" ")
}
