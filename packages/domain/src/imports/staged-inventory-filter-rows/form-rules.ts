import type { StagedInventoryFilterForm } from "./types.js"

export type StagedInventoryFilterValidationIssue =
  | { code: "FILTER_PRODUCT_REQUIRED" }
  | { code: "FILTER_STOCK_ORDERED_INVALID"; value: string }
  | { code: "FILTER_STOCK_ORDERED_NEGATIVE"; value: string }

export function validateStagedInventoryFilterForm(
  input: StagedInventoryFilterForm,
): StagedInventoryFilterValidationIssue[] {
  const issues: StagedInventoryFilterValidationIssue[] = []

  if (!input.productId.trim()) {
    issues.push({ code: "FILTER_PRODUCT_REQUIRED" })
  }

  // Stock ordered is optional — a blank value is a legitimate "not yet
  // ordered" state. Only validate format/sign when a value is present.
  const raw = input.stockOrdered.trim()
  if (raw.length > 0) {
    if (!Number.isFinite(Number(raw))) {
      issues.push({ code: "FILTER_STOCK_ORDERED_INVALID", value: input.stockOrdered })
    } else if (Number(raw) < 0) {
      issues.push({ code: "FILTER_STOCK_ORDERED_NEGATIVE", value: input.stockOrdered })
    }
  }

  return issues
}

export function describeStagedInventoryFilterValidationIssue(
  issue: StagedInventoryFilterValidationIssue,
): string {
  switch (issue.code) {
    case "FILTER_PRODUCT_REQUIRED":
      return "Select a product for the filter row."
    case "FILTER_STOCK_ORDERED_INVALID":
      return "Stock ordered must be a number."
    case "FILTER_STOCK_ORDERED_NEGATIVE":
      return "Stock ordered cannot be negative."
  }
}

export function describeStagedInventoryFilterValidationIssues(
  issues: StagedInventoryFilterValidationIssue[],
): string {
  return issues.map(describeStagedInventoryFilterValidationIssue).join(" ")
}
