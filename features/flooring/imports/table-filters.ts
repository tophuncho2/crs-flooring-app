import type { TableFilterDefinition } from "@/features/flooring/shared/controllers/table/table-filter-state"
import { ALL_IMPORT_STATUS_FILTER, ALL_IMPORT_WAREHOUSE_FILTER } from "@/features/flooring/imports/domain/filters"

export function createImportsPageFilterDefinitions(warehouseOptions: Array<{ id: string; name: string }>): TableFilterDefinition[] {
  return [
    {
      key: "status",
      param: "status",
      type: "tabs",
      defaultValue: ALL_IMPORT_STATUS_FILTER,
      options: [
        { value: ALL_IMPORT_STATUS_FILTER, label: "All" },
        { value: "PENDING", label: "Pending" },
        { value: "FINAL", label: "Final" },
      ],
    },
    {
      key: "warehouseId",
      param: "warehouse",
      type: "select",
      label: "Warehouse",
      defaultValue: ALL_IMPORT_WAREHOUSE_FILTER,
      options: [
        { value: ALL_IMPORT_WAREHOUSE_FILTER, label: "All Warehouses" },
        ...warehouseOptions.map((warehouse) => ({
          value: warehouse.id,
          label: warehouse.name,
        })),
      ],
    },
  ]
}
