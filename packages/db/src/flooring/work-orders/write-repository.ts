import { db } from "../../client.js"
import { normalizeWorkOrder, type WorkOrderDetail } from "@builders/domain"
import { workOrderDetailSelect, type WorkOrdersDbClient } from "./shared.js"

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
  propertyInstructions?: string | null
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
