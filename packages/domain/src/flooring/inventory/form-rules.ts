import { InventoryDomainError } from "./errors.js"

/**
 * Note on scope: `startingStock` is immutable on real inventory rows. Users
 * never submit it in the form — the worker seeds it from the staged row at
 * import time. This validator therefore does NOT check startingStock; it only
 * covers the fields a user can actually change (see `editability.ts` for the
 * full immutable/editable split).
 */
export type InventoryFormValidationIssue =
  | { code: "WAREHOUSE_REQUIRED" }
  | { code: "LOCATION_WAREHOUSE_MISMATCH"; locationWarehouseId: string; warehouseId: string }

export type InventoryFormDraft = {
  warehouseId: string
  locationId: string | null
}

export type LocationLookup = { id: string; warehouseId: string }

export function validateInventoryForm(
  input: InventoryFormDraft,
  location: LocationLookup | null,
): InventoryFormValidationIssue[] {
  const issues: InventoryFormValidationIssue[] = []

  if (!input.warehouseId.trim()) {
    issues.push({ code: "WAREHOUSE_REQUIRED" })
  }

  if (input.locationId && input.warehouseId && location) {
    if (location.warehouseId !== input.warehouseId) {
      issues.push({
        code: "LOCATION_WAREHOUSE_MISMATCH",
        locationWarehouseId: location.warehouseId,
        warehouseId: input.warehouseId,
      })
    }
  }

  return issues
}

export function assertLocationBelongsToWarehouse(
  location: LocationLookup,
  warehouseId: string,
): void {
  if (location.warehouseId !== warehouseId) {
    throw new InventoryDomainError(
      "INVENTORY_LOCATION_WAREHOUSE_MISMATCH",
      `Location ${location.id} belongs to warehouse ${location.warehouseId}, not ${warehouseId}`,
    )
  }
}

export function describeInventoryFormValidationIssue(issue: InventoryFormValidationIssue): string {
  switch (issue.code) {
    case "WAREHOUSE_REQUIRED":
      return "Warehouse is required."
    case "LOCATION_WAREHOUSE_MISMATCH":
      return "The selected location does not belong to the selected warehouse."
  }
}

export function describeInventoryFormValidationIssues(
  issues: InventoryFormValidationIssue[],
): string {
  return issues.map(describeInventoryFormValidationIssue).join(" ")
}
