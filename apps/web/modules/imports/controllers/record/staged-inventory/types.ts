import type {
  StagedInventoryFilterRow,
  StagedInventoryRow,
} from "@builders/domain"

/**
 * Patches emitted by the staged-inv-row side panel. Carries the refreshed
 * filter row so the parent can keep `remainingStock` + `startingStockSum` +
 * `childRowCount` in sync without a list refetch.
 */
export type StagedInvRowPanelPatch =
  | { kind: "upsert"; row: StagedInventoryRow; filterRow: StagedInventoryFilterRow }
  | { kind: "delete"; rowId: string; filterRow: StagedInventoryFilterRow }
