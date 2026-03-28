import type { Role } from "@builders/db"
import { buildWorkOrderCapabilityFlags } from "@/features/flooring/shared/access/templates-work-orders"
import type { WorkOrderDetail } from "@/features/flooring/work-orders/types"

export function withWorkOrderCapabilities(workOrder: WorkOrderDetail, role: Role): WorkOrderDetail {
  return {
    ...workOrder,
    capabilities: buildWorkOrderCapabilityFlags(role),
  }
}
