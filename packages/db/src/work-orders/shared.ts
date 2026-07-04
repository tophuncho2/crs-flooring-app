import type { Prisma, PrismaClient } from "../generated/prisma/client.js"

export type WorkOrdersDbClient = PrismaClient | Prisma.TransactionClient

/**
 * List-view select. Excludes detail-only columns (items, files) and uses the
 * lightweight `property: { name }` join. Surfaces the
 * WO-owned address columns (streetAddress/city/state/postalCode) so the list
 * grid can display + search them, plus `status`, `description`, `scheduledFor`
 * for badges + sortable columns.
 */
export const workOrderListSelect = {
  id: true,
  workOrderNumber: true,
  color: true,
  propertyId: true,
  property: {
    select: { name: true, entity: { select: { id: true, entity: true } } },
  },
  jobTypeId: true,
  jobType: { select: { id: true, name: true } },
  templateId: true,
  warehouseId: true,
  warehouse: { select: { name: true } },
  unitNumber: true,
  unitType: true,
  vacancy: true,
  timeOfDay: true,
  scheduledFor: true,
  description: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  customerName: true,
  purchaseOrderNumber: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} as const

/**
 * Detail select used by the record view. Pulls the joined property
 * shape the rewritten WorkOrderDetail normalizer expects (full address
 * + live `instructions` for the read-only lookup cell).
 */
export const workOrderDetailSelect = {
  id: true,
  workOrderNumber: true,
  workOrderNumberInt: true,
  color: true,
  propertyId: true,
  property: {
    select: {
      name: true,
      entity: { select: { id: true, entity: true } },
      instructions: true,
    },
  },
  jobTypeId: true,
  jobType: { select: { id: true, name: true } },
  templateId: true,
  warehouseId: true,
  warehouse: { select: { name: true } },
  unitNumber: true,
  unitType: true,
  vacancy: true,
  timeOfDay: true,
  scheduledFor: true,
  description: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  customerName: true,
  internalNotes: true,
  installerInstructions: true,
  purchaseOrderNumber: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} as const

export type WorkOrderListPayload = Prisma.FlooringWorkOrderGetPayload<{ select: typeof workOrderListSelect }>
export type WorkOrderDetailPayload = Prisma.FlooringWorkOrderGetPayload<{ select: typeof workOrderDetailSelect }>
