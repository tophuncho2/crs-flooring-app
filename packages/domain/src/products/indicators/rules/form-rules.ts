import { isValidMoneyAmount } from "../../../shared/money.js"
import type {
  InventoryIndicatorCreateForm,
  InventoryIndicatorUpdateForm,
} from "../types.js"

export type IndicatorFormIssue =
  | { code: "INDICATOR_WAREHOUSE_REQUIRED" }
  | { code: "INDICATOR_UNIT_REQUIRED" }
  | { code: "INDICATOR_THRESHOLD_INVALID"; value: string }

// The threshold is optional (empty = no threshold → neutral status). When present
// it must be a well-formed, non-negative money amount (the money pattern already
// rejects negatives).
function validateThreshold(raw: string, issues: IndicatorFormIssue[]): void {
  const value = raw.trim()
  if (value.length > 0 && !isValidMoneyAmount(value)) {
    issues.push({ code: "INDICATOR_THRESHOLD_INVALID", value: raw })
  }
}

export function validateIndicatorCreateForm(
  input: InventoryIndicatorCreateForm,
): IndicatorFormIssue[] {
  const issues: IndicatorFormIssue[] = []
  if (!input.warehouseId.trim()) {
    issues.push({ code: "INDICATOR_WAREHOUSE_REQUIRED" })
  }
  if (!input.unitId.trim()) {
    issues.push({ code: "INDICATOR_UNIT_REQUIRED" })
  }
  validateThreshold(input.lowStockThreshold, issues)
  return issues
}

export function validateIndicatorUpdateForm(
  input: InventoryIndicatorUpdateForm,
): IndicatorFormIssue[] {
  const issues: IndicatorFormIssue[] = []
  validateThreshold(input.lowStockThreshold, issues)
  return issues
}

export function describeIndicatorFormIssue(issue: IndicatorFormIssue): string {
  switch (issue.code) {
    case "INDICATOR_WAREHOUSE_REQUIRED":
      return "Warehouse is required."
    case "INDICATOR_UNIT_REQUIRED":
      return "Unit is required."
    case "INDICATOR_THRESHOLD_INVALID":
      return "Low-stock threshold is not a valid amount."
  }
}

export function describeIndicatorFormIssues(issues: IndicatorFormIssue[]): string {
  return issues.map(describeIndicatorFormIssue).join(" ")
}
