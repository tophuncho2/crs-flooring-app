import { db } from "../client.js"
import type { Prisma } from "../generated/prisma/client.js"
import {
  normalizeMoneyAmount,
  normalizeWorkOrder,
  type FlooringPaymentDirection,
  type PaletteColor,
  type WorkOrderDetail,
  type WorkOrderMaterialItemRow,
  type WorkOrderPlannedPaymentRow,
} from "@builders/domain"
import { workOrderDetailSelect, type WorkOrdersDbClient } from "./shared.js"
import { listWorkOrderMaterialItems } from "./material-items/read-repository.js"
import { listWorkOrderPlannedPayments } from "./planned-payments/read-repository.js"

export type CreateWorkOrderRecordInput = {
  // Non-null column (DB default SLATE) — optional on input, never cleared to null.
  color?: PaletteColor
  propertyId: string | null
  templateId: string | null
  jobTypeId: string | null
  warehouseId: string | null
  unitNumber?: string | null
  unitType?: string | null
  streetAddress?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  customerName?: string | null
  description?: string | null
  installer?: string | null
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
 * Prisma `createMany`. Synced rows are copies of the template's planned
 * products — they carry no back-reference to their template origin.
 */
export type CreateWorkOrderFromTemplateRecordInput = {
  // Actor email stamped on the new work order AND every materialized item
  // (createdBy + updatedBy). Sync is a human action, so it stamps.
  actorEmail: string
  workOrder: Omit<CreateWorkOrderRecordInput, "createdBy" | "updatedBy">
  items: Array<{
    productId: string
    quantity: string
    // Template item's editable unit FK, carried forward to the WO item (UoM
    // epic 2C). "" / null → no unit. The frozen sendUnit* snapshot is no longer
    // copied; `unitId` is authoritative.
    unitId: string | null
    notes: string | null
  }>
  // Planned payments copied 1:1 from the template. Unlike planned products
  // (which drop `cost`), payments carry amount / direction / notes / entityId
  // verbatim. `amount` is required (money boundary); `entityId` is a nullable
  // FK whose target is known to exist, so the straight copy is FK-safe.
  plannedPayments: Array<{
    amount: string
    direction: FlooringPaymentDirection
    notes: string | null
    entityId: string | null
  }>
}

export type CreateWorkOrderFromTemplateRecordResult = {
  workOrder: WorkOrderDetail
  items: WorkOrderMaterialItemRow[]
  plannedPayments: WorkOrderPlannedPaymentRow[]
}

// Sync carries the template item's quantity through verbatim. Quantity is
// optional, so a blank value (template item with no quantity) is stored as
// NULL on the new work-order item rather than coerced to 0.
function toItemDecimal(value: string): Prisma.Decimal | string | null {
  return value.trim() ? value : null
}

// Money write boundary (money standard): planned-payment amount is required —
// the canonical fixed-scale-2 string handed straight to Prisma (coerced to Decimal).
function toMoney(value: string): string {
  return normalizeMoneyAmount(value)
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
        unitId: item.unitId && item.unitId.trim() ? item.unitId : null,
        notes: item.notes,
        createdBy: input.actorEmail,
        updatedBy: input.actorEmail,
      })),
    })
  }

  if (input.plannedPayments.length > 0) {
    await client.flooringWorkOrderPlannedPayment.createMany({
      data: input.plannedPayments.map((payment) => ({
        workOrderId: created.id,
        amount: toMoney(payment.amount),
        direction: payment.direction,
        notes: payment.notes ? payment.notes : null,
        entityId: payment.entityId,
        createdBy: input.actorEmail,
        updatedBy: input.actorEmail,
      })),
    })
  }

  const items = await listWorkOrderMaterialItems(created.id, client)
  const plannedPayments = await listWorkOrderPlannedPayments(created.id, client)
  return { workOrder: normalizeWorkOrder(created), items, plannedPayments }
}
