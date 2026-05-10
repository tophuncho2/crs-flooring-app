import type { StagedInventoryForm } from "./types.js"

export type StagedInventoryValidationIssue =
  | { code: "STAGED_PRODUCT_REQUIRED" }
  | { code: "STAGED_WAREHOUSE_REQUIRED" }
  | { code: "STAGED_STARTING_STOCK_INVALID"; value: string }
  | { code: "STAGED_STARTING_STOCK_NEGATIVE"; value: string }

/**
 * Per-row form validator for a staged inventory draft. The diff-level
 * validator (see diff/rules.ts) also calls this per projected row.
 */
export function validateStagedInventoryForm(
  input: StagedInventoryForm,
): StagedInventoryValidationIssue[] {
  const issues: StagedInventoryValidationIssue[] = []

  if (!input.productId.trim()) {
    issues.push({ code: "STAGED_PRODUCT_REQUIRED" })
  }

  if (!input.warehouseId.trim()) {
    issues.push({ code: "STAGED_WAREHOUSE_REQUIRED" })
  }

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
    case "STAGED_PRODUCT_REQUIRED":
      return "Select a product for the staged inventory row."
    case "STAGED_WAREHOUSE_REQUIRED":
      return "Warehouse is required on staged inventory rows."
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
