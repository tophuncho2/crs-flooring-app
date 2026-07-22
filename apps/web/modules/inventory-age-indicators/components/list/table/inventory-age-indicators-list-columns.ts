import type { DataTableColumn } from "@/engines/list-view"
import type { InventoryAgeIndicatorListRow } from "@builders/domain"

export const INVENTORY_AGE_INDICATORS_LIST_COLUMNS: ReadonlyArray<
  DataTableColumn<InventoryAgeIndicatorListRow>
> = [
  { key: "days", label: "Days" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]
