import type { InventoryAdjustmentPendingForm } from "../types.js"

export type AdjustmentPendingFormIssue =
  | { code: "ADJUSTMENT_QUANTITY_REQUIRED" }
  | { code: "ADJUSTMENT_QUANTITY_INVALID"; value: string }
  | { code: "ADJUSTMENT_QUANTITY_NOT_POSITIVE"; value: string }

export function validateAdjustmentPendingForm(
  input: InventoryAdjustmentPendingForm,
): AdjustmentPendingFormIssue[] {
  const issues: AdjustmentPendingFormIssue[] = []

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

export function describeAdjustmentPendingFormIssue(issue: AdjustmentPendingFormIssue): string {
  switch (issue.code) {
    case "ADJUSTMENT_QUANTITY_REQUIRED":
      return "Quantity is required."
    case "ADJUSTMENT_QUANTITY_INVALID":
      return "Quantity must be a number."
    case "ADJUSTMENT_QUANTITY_NOT_POSITIVE":
      return "Quantity must be greater than zero."
  }
}

export function describeAdjustmentPendingFormIssues(issues: AdjustmentPendingFormIssue[]): string {
  return issues.map(describeAdjustmentPendingFormIssue).join(" ")
}
