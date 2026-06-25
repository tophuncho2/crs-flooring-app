import type { DataTableColumn } from "@/engines/list-view"
import type { UnitOfMeasureListRow } from "@builders/domain"

export const UNIT_OF_MEASURES_LIST_COLUMNS: ReadonlyArray<
  DataTableColumn<UnitOfMeasureListRow>
> = [
  { key: "name", label: "Unit Of Measure" },
  { key: "createdAt", label: "Created" },
]
