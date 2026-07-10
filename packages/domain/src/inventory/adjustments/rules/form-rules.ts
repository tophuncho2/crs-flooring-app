import type { InventoryAdjustmentForm } from "../types.js"

export type AdjustmentFormIssue =
  | { code: "ADJUSTMENT_QUANTITY_REQUIRED" }
  | { code: "ADJUSTMENT_QUANTITY_INVALID"; value: string }
  | { code: "ADJUSTMENT_QUANTITY_NOT_POSITIVE"; value: string }

export function validateAdjustmentForm(
  input: InventoryAdjustmentForm,
): AdjustmentFormIssue[] {
  const issues: AdjustmentFormIssue[] = []

  const raw = input.quantity.trim()
  if (raw.length === 0) {
    issues.push({ code: "ADJUSTMENT_QUANTITY_REQUIRED" })
  } else {
    const quantity = Number(raw)
    if (!Number.isFinite(quantity)) {
      issues.push({ code: "ADJUSTMENT_QUANTITY_INVALID", value: input.quantity })
    } else if (quantity <= 0) {
      issues.push({ code: "ADJUSTMENT_QUANTITY_NOT_POSITIVE", value: input.quantity })
    }
  }

  return issues
}

export function describeAdjustmentFormIssue(issue: AdjustmentFormIssue): string {
  switch (issue.code) {
    case "ADJUSTMENT_QUANTITY_REQUIRED":
      return "Quantity is required."
    case "ADJUSTMENT_QUANTITY_INVALID":
      return "Quantity must be a number."
    case "ADJUSTMENT_QUANTITY_NOT_POSITIVE":
      return "Quantity must be greater than zero."
  }
}

export function describeAdjustmentFormIssues(issues: AdjustmentFormIssue[]): string {
  return issues.map(describeAdjustmentFormIssue).join(" ")
}
