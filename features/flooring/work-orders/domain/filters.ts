import { WORK_ORDER_STATUS_OPTIONS } from "@/features/flooring/work-orders/contracts"

export type WorkOrderStatusFilter = (typeof WORK_ORDER_STATUS_OPTIONS)[number]

export type WorkOrderPageFilterState = {
  status: WorkOrderStatusFilter[]
  warehouseId: string[]
}

export function parseWorkOrderStatusFilter(value: unknown): WorkOrderStatusFilter[] {
  const normalizedValues = Array.isArray(value) ? value : [value]
  return Array.from(
    new Set(
      normalizedValues
        .map((entry) => String(entry ?? "").trim().toUpperCase())
        .filter((entry): entry is WorkOrderStatusFilter => WORK_ORDER_STATUS_OPTIONS.includes(entry as WorkOrderStatusFilter)),
    ),
  )
}

export function parseWorkOrderWarehouseFilter(value: unknown) {
  const normalizedValues = Array.isArray(value) ? value : [value]
  return Array.from(
    new Set(
      normalizedValues
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0),
    ),
  )
}
