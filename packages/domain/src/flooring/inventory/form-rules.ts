/**
 * Note on scope: `startingStock` is immutable on real inventory rows. Users
 * never submit it in the form — the worker seeds it from the staged row at
 * import time. This validator therefore does NOT check startingStock; it only
 * covers the fields a user can actually change (see `editability.ts` for the
 * full immutable/editable split).
 *
 * Post-sweep: `location` is plain text (not an FK to FlooringLocation), so the
 * legacy LOCATION_WAREHOUSE_MISMATCH rule is gone — no per-row warehouse
 * scoping on free-text location values.
 */
export type InventoryFormValidationIssue = { code: "WAREHOUSE_REQUIRED" }

export type InventoryFormDraft = {
  warehouseId: string
}

export function validateInventoryForm(
  input: InventoryFormDraft,
): InventoryFormValidationIssue[] {
  const issues: InventoryFormValidationIssue[] = []

  if (!input.warehouseId.trim()) {
    issues.push({ code: "WAREHOUSE_REQUIRED" })
  }

  return issues
}

export function describeInventoryFormValidationIssue(issue: InventoryFormValidationIssue): string {
  switch (issue.code) {
    case "WAREHOUSE_REQUIRED":
      return "Warehouse is required."
  }
}

export function describeInventoryFormValidationIssues(
  issues: InventoryFormValidationIssue[],
): string {
  return issues.map(describeInventoryFormValidationIssue).join(" ")
}
