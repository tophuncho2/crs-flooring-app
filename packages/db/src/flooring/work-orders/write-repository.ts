import { db } from "../../client.js"
import type { Prisma } from "../../generated/prisma/client.js"
import {
  normalizeWorkOrder,
  type PaletteColor,
  type WorkOrderDetail,
  type WorkOrderMaterialItemRow,
} from "@builders/domain"
import { workOrderDetailSelect, type WorkOrdersDbClient } from "./shared.js"
import { listWorkOrderMaterialItems } from "./material-items/read-repository.js"

export type CreateWorkOrderRecordInput = {
  // Non-null column (DB default SLATE) — optional on input, never cleared to null.
  color?: PaletteColor
  propertyId: string | null
  templateId: string | null
  jobTypeId: string | null
  warehouseId: string | null
  unitNumber?: string | null
  unitType?: string | null
  customAddress?: string | null
  description?: string | null
  internalNotes?: string | null
  installerInstructions?: string | null
  purchaseOrderNumber?: string | null
  scheduledFor?: Date | null
  vacancy?: "VACANT" | "OCCUPIED" | null
  timeOfDay?: "AM" | "PM" | null
  // Actor-email snapshots — required on create (creator stamps both).
  createdBy: string
  updatedBy: string
}

// createdBy is immutable after insert; an update only ever flips updatedBy.
export type UpdateWorkOrderRecordInput = Partial<
  Omit<CreateWorkOrderRecordInput, "createdBy" | "updatedBy">
> & { updatedBy: string }

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
 * Wire-input shape for creating a work order from a template. Items use
 * Prisma `createMany` and each carries `sourceTemplateItemId` so the
 * new work order's items remember their template origin.
 */
export type CreateWorkOrderFromTemplateRecordInput = {
  // Actor email stamped on the new work order AND every materialized item
  // (createdBy + updatedBy). Sync is a human action, so it stamps.
  actorEmail: string
  workOrder: Omit<CreateWorkOrderRecordInput, "createdBy" | "updatedBy">
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

// Sync carries the template item's quantity through verbatim. Quantity is
// optional, so a blank value (template item with no quantity) is stored as
// NULL on the new work-order item rather than coerced to 0.
function toItemDecimal(value: string): Prisma.Decimal | string | null {
  return value.trim() ? value : null
}

export async function createWorkOrderFromTemplateRecord(
  input: CreateWorkOrderFromTemplateRecordInput,
  client: WorkOrdersDbClient = db,
): Promise<CreateWorkOrderFromTemplateRecordResult> {
  const created = await client.flooringWorkOrder.create({
    data: { ...input.workOrder, createdBy: input.actorEmail, updatedBy: input.actorEmail },
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
        createdBy: input.actorEmail,
        updatedBy: input.actorEmail,
      })),
    })
  }

  const items = await listWorkOrderMaterialItems(created.id, client)
  return { workOrder: normalizeWorkOrder(created), items }
}
