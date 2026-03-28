import type { WorkOrderInvoiceViewRecord } from "@builders/db"
import { normalizeWorkOrderInvoiceStatus } from "@/features/flooring/work-orders/services"
import type { WorkOrderInvoiceStatus } from "@/features/flooring/work-orders/types"

export type WorkOrderInvoiceStatusResponse = WorkOrderInvoiceStatus

export function buildWorkOrderInvoiceStatusResponse(
  workOrderId: string,
  invoice: WorkOrderInvoiceViewRecord,
): WorkOrderInvoiceStatusResponse {
  return normalizeWorkOrderInvoiceStatus(workOrderId, invoice)
}
