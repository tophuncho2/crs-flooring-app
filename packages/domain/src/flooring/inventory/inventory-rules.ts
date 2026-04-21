import { InventoryDomainError } from "./errors.js"
import { parseInventoryDecimal } from "./formatters.js"

export type InventoryValidationIssue =
  | { code: "PRODUCT_REQUIRED" }
  | { code: "ITEM_NUMBER_REQUIRED" }
  | { code: "STOCK_COUNT_NEGATIVE"; value: string }
  | { code: "STOCK_COUNT_INVALID"; value: string }
  | { code: "WAREHOUSE_REQUIRED" }
  | { code: "LOCATION_WAREHOUSE_MISMATCH"; locationWarehouseId: string; warehouseId: string }
  | { code: "IMPORTED_REVERSAL_NOT_ALLOWED" }

export type InventoryInputDraft = {
  productId: string
  itemNumber: string
  warehouseId: string | null
  locationId: string | null
  stockCount: string
}

export type LocationLookup = { id: string; warehouseId: string }

export function validateInventoryInput(
  input: InventoryInputDraft,
  location: LocationLookup | null,
): InventoryValidationIssue[] {
  const issues: InventoryValidationIssue[] = []

  if (!input.productId.trim()) issues.push({ code: "PRODUCT_REQUIRED" })
  if (!input.itemNumber.trim()) issues.push({ code: "ITEM_NUMBER_REQUIRED" })

  const raw = input.stockCount.trim()
  if (raw.length === 0 || !Number.isFinite(Number(raw))) {
    issues.push({ code: "STOCK_COUNT_INVALID", value: input.stockCount })
  } else if (parseInventoryDecimal(raw) < 0) {
    issues.push({ code: "STOCK_COUNT_NEGATIVE", value: input.stockCount })
  }

  if (!input.warehouseId) {
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
    throw new Error(
      `Location ${location.id} belongs to warehouse ${location.warehouseId}, not ${warehouseId}`,
    )
  }
}

export type InventoryDependentCounts = {
  cutLogsCount: number
}

export function isInventoryDeleteBlocked(counts: InventoryDependentCounts): boolean {
  return counts.cutLogsCount > 0
}

export function buildInventoryDeleteBlockedMessage(counts: InventoryDependentCounts): string {
  if (counts.cutLogsCount <= 0) return "Inventory row has no linked cut logs"
  return `Inventory cannot be deleted while ${counts.cutLogsCount} cut log${counts.cutLogsCount === 1 ? "" : "s"} reference${counts.cutLogsCount === 1 ? "s" : ""} it`
}

export function canAddCutLog(inventory: { isImported: boolean }): boolean {
  return inventory.isImported === true
}

/**
 * Pure predicate: does `next` attempt to flip an already-imported row back to
 * pending? Used by one-shot updates (via `assertImportedTransitionAllowed`) and
 * by diff validation (via a direct check so issues can be collected rather than
 * thrown). `isImported` is a one-way latch — once true, it stays true.
 */
export function isImportedReversal(
  current: { isImported: boolean },
  next: { isImported?: boolean },
): boolean {
  return current.isImported === true && next.isImported === false
}

export function assertImportedTransitionAllowed(
  current: { isImported: boolean },
  next: { isImported?: boolean },
): void {
  if (isImportedReversal(current, next)) {
    throw new InventoryDomainError(
      "IMPORTED_REVERSAL_NOT_ALLOWED",
      "Inventory row is already imported and cannot return to pending.",
    )
  }
}

export function getCutLogBlockedReason(inventory: { isImported: boolean }): string {
  return canAddCutLog(inventory)
    ? ""
    : "Inventory must be received (isImported = true) before cut logs can be added."
}

export function describeInventoryValidationIssue(issue: InventoryValidationIssue): string {
  switch (issue.code) {
    case "PRODUCT_REQUIRED":
      return "Select a product for the inventory row."
    case "ITEM_NUMBER_REQUIRED":
      return "Item # is required."
    case "STOCK_COUNT_INVALID":
      return "Starting balance must be a number."
    case "STOCK_COUNT_NEGATIVE":
      return "Starting balance cannot be negative."
    case "WAREHOUSE_REQUIRED":
      return "Warehouse is required."
    case "LOCATION_WAREHOUSE_MISMATCH":
      return "The selected location does not belong to the selected warehouse."
    case "IMPORTED_REVERSAL_NOT_ALLOWED":
      return "Inventory row is already imported and cannot return to pending."
  }
}

export function describeInventoryValidationIssues(issues: InventoryValidationIssue[]): string {
  return issues.map(describeInventoryValidationIssue).join(" ")
}
