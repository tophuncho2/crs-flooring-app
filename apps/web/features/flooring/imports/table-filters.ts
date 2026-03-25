import type { TableFilterDefinition } from "@/features/flooring/shared/controllers/table/table-filter-state"

export function createImportsPageFilterDefinitions(warehouseOptions: Array<{ id: string; name: string }>): TableFilterDefinition[] {
  return [
    {
      key: "status",
      param: "status",
      type: "tabs",
      label: "Status",
      clearLabel: "All",
      options: [
        { value: "PENDING", label: "Pending" },
        { value: "FINAL", label: "Final" },
      ],
    },
    {
      key: "warehouseId",
      param: "warehouse",
      type: "select",
      label: "Warehouse",
      clearLabel: "All Warehouses",
      options: [
        ...warehouseOptions.map((warehouse) => ({
          value: warehouse.id,
          label: warehouse.name,
        })),
      ],
    },
  ]
}
