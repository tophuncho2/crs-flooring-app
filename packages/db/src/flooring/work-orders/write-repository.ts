import { db } from "../../client.js"
import type { Prisma } from "@prisma/client"
import {
  normalizeWorkOrder,
  type WorkOrderDetail,
  type WorkOrderMaterialItemRow,
  type WorkOrderStatus,
} from "@builders/domain"
import { workOrderDetailSelect, type WorkOrdersDbClient } from "./shared.js"
import { listWorkOrderMaterialItems } from "./material-items/read-repository.js"

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

/**
 * Wire-input shape for creating a work order from a template snapshot.
 * Carries the same fields as `CreateWorkOrderRecordInput` plus the three
 * worker-controlled sync columns the application layer fills in for
 * sync flows (templateSyncedAt / templateSyncMode / templateSnapshotHash)
 * and the per-item snapshot rows. Items use Prisma `createMany` and each
 * carries `sourceTemplateItemId` so the new work order's items remember
 * their template origin.
 */
export type CreateWorkOrderFromTemplateRecordInput = {
  workOrder: CreateWorkOrderRecordInput & {
    templateSyncedAt: Date
    templateSyncMode: string
    templateSnapshotHash: string
  }
  items: Array<{
    productId: string
    quantity: string
    sendUnitName: string
    sendUnitAbbrev: string
    notes: string | null
    sourceTemplateItemId: string
  }>
}

export type CreateWorkOrderFromTemplateRecordResult = {
  workOrder: WorkOrderDetail
  items: WorkOrderMaterialItemRow[]
}

function toItemDecimal(value: string): Prisma.Decimal | string {
  return value
}

export async function createWorkOrderFromTemplateRecord(
  input: CreateWorkOrderFromTemplateRecordInput,
  client: WorkOrdersDbClient = db,
): Promise<CreateWorkOrderFromTemplateRecordResult> {
  const created = await client.flooringWorkOrder.create({
    data: input.workOrder,
    select: workOrderDetailSelect,
  })

  if (input.items.length > 0) {
    await client.flooringWorkOrderItem.createMany({
      data: input.items.map((item) => ({
        workOrderId: created.id,
        productId: item.productId,
        quantity: toItemDecimal(item.quantity),
        sendUnitName: item.sendUnitName,
        sendUnitAbbrev: item.sendUnitAbbrev,
        notes: item.notes,
        sourceTemplateItemId: item.sourceTemplateItemId,
      })),
    })
  }

  const items = await listWorkOrderMaterialItems(created.id, client)
  return { workOrder: normalizeWorkOrder(created), items }
}
