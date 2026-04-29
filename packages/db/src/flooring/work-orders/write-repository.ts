import { db } from "../../client.js"
import {
  normalizeWorkOrder,
  type WorkOrderDetail,
  type WorkOrderStatus,
} from "@builders/domain"
import { workOrderDetailSelect, type WorkOrdersDbClient } from "./shared.js"

/**
 * Wire input for create. `status` and the template-sync snapshot fields
 * (templateSyncedAt / templateSyncMode / templateSnapshotHash) are
 * intentionally omitted — they are worker-controlled and never set from
 * the API surface.
 */
export type CreateWorkOrderRecordInput = {
  propertyId: string
  templateId: string | null
  managementCompanyId: string | null
  jobTypeId: string | null
  warehouseId: string | null
  unitNumber?: string | null
  unitType?: string | null
  customAddress?: string | null
  description?: string | null
  instructions?: string | null
  notes?: string | null
  scheduledFor?: Date | null
  isComplete?: boolean
  vacancy?: "VACANT" | "OCCUPIED" | null
}

export type UpdateWorkOrderRecordInput = Partial<CreateWorkOrderRecordInput>

export async function createWorkOrderRecord(
  input: CreateWorkOrderRecordInput,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderDetail> {
  const workOrder = await client.flooringWorkOrder.create({
    data: input,
    select: workOrderDetailSelect,
  })
  return normalizeWorkOrder(workOrder)
}

export async function updateWorkOrderRecord(
  id: string,
  input: UpdateWorkOrderRecordInput,
  client: WorkOrdersDbClient = db,
): Promise<WorkOrderDetail> {
  const workOrder = await client.flooringWorkOrder.update({
    where: { id },
    data: input,
    select: workOrderDetailSelect,
  })
  return normalizeWorkOrder(workOrder)
}

export async function deleteWorkOrderRecordById(
  id: string,
  client: WorkOrdersDbClient = db,
): Promise<void> {
  await client.flooringWorkOrder.delete({ where: { id } })
}

/**
 * Sets the work order's worker-controlled status. Called by:
 *  - The file-gen producer use case (IDLE → QUEUED).
 *  - The file-gen worker (QUEUED → WORKING → COMPLETED, or → FAILED).
 *
 * The application layer is responsible for any transition validation;
 * this function is a thin write per the data-package no-business-logic
 * rule.
 */
export async function markWorkOrderStatus(
  id: string,
  status: WorkOrderStatus,
  client: WorkOrdersDbClient = db,
): Promise<void> {
  await client.flooringWorkOrder.update({
    where: { id },
    data: { status },
    select: { id: true },
  })
}
