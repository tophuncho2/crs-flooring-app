import type { Role } from "@builders/db"
import { buildWorkOrderCapabilityFlags } from "@/modules/shared/access/templates-work-orders"
import type { WorkOrderDetail } from "@/modules/work-orders/types"

export function withWorkOrderCapabilities(workOrder: WorkOrderDetail, role: Role): WorkOrderDetail {
  return {
    ...workOrder,
    capabilities: buildWorkOrderCapabilityFlags(role),
  }
}
