import type { TableFilterDefinition } from "@/features/flooring/shared/controllers/table/table-filter-state"
import { getWorkOrderStatusLabel, WORK_ORDER_STATUS_OPTIONS } from "@/features/flooring/work-orders/contracts"
import { ALL_WORK_ORDER_STATUS_FILTER, ALL_WORK_ORDER_WAREHOUSE_FILTER } from "@/features/flooring/work-orders/domain/filters"

export function createWorkOrdersPageFilterDefinitions(warehouseOptions: Array<{ id: string; name: string }>): TableFilterDefinition[] {
  return [
    {
      key: "status",
      param: "status",
      type: "tabs",
      defaultValue: ALL_WORK_ORDER_STATUS_FILTER,
      options: [
        { value: ALL_WORK_ORDER_STATUS_FILTER, label: "All" },
        ...WORK_ORDER_STATUS_OPTIONS.map((status) => ({
          value: status,
          label: getWorkOrderStatusLabel({
            status,
            isComplete: false,
          }),
        })),
      ],
    },
    {
      key: "warehouseId",
      param: "warehouse",
      type: "select",
      label: "Warehouse",
      defaultValue: ALL_WORK_ORDER_WAREHOUSE_FILTER,
      options: [
        { value: ALL_WORK_ORDER_WAREHOUSE_FILTER, label: "All Warehouses" },
        ...warehouseOptions.map((warehouse) => ({
          value: warehouse.id,
          label: warehouse.name,
        })),
      ],
    },
  ]
}
