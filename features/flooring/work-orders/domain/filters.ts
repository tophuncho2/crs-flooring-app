import { WORK_ORDER_STATUS_OPTIONS } from "@/features/flooring/work-orders/contracts"

export const ALL_WORK_ORDER_STATUS_FILTER = "all" as const
export const ALL_WORK_ORDER_WAREHOUSE_FILTER = "all" as const

export type WorkOrderStatusFilter = "all" | (typeof WORK_ORDER_STATUS_OPTIONS)[number]

export type WorkOrderPageFilterState = {
  status: WorkOrderStatusFilter
  warehouseId: string
}

export function parseWorkOrderStatusFilter(value: unknown): WorkOrderStatusFilter {
  const normalized = String(value ?? "").trim().toUpperCase()

  if (WORK_ORDER_STATUS_OPTIONS.includes(normalized as (typeof WORK_ORDER_STATUS_OPTIONS)[number])) {
    return normalized as WorkOrderStatusFilter
  }

  return ALL_WORK_ORDER_STATUS_FILTER
}

export function parseWorkOrderWarehouseFilter(value: unknown) {
  const normalized = String(value ?? "").trim()
  return normalized && normalized !== ALL_WORK_ORDER_WAREHOUSE_FILTER ? normalized : ALL_WORK_ORDER_WAREHOUSE_FILTER
}
