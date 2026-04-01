import type { TableFilterDefinition } from "@/modules/shared/engines/list-view/controllers/table-filter-state"
import { getWorkOrderStatusLabel, WORK_ORDER_STATUS_OPTIONS } from "@/modules/work-orders/contracts"

export function createWorkOrdersPageFilterDefinitions(warehouseOptions: Array<{ id: string; name: string }>): TableFilterDefinition[] {
  return [
    {
      key: "status",
      param: "status",
      type: "tabs",
      label: "Status",
      clearLabel: "All",
      options: [
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
