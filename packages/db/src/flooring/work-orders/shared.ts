import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"

export type WorkOrdersDbClient = PrismaClient | Prisma.TransactionClient

/**
 * List-view select. Excludes detail-only columns (customAddress, items,
 * files) and uses the lightweight `property: { name }` join because list
 * rows do not display the full address. Surfaces `status`, `description`,
 * `scheduledFor` so the list grid can render badges + sortable columns.
 */
export const workOrderListSelect = {
  id: true,
  workOrderNumber: true,
  propertyId: true,
  property: {
    select: { name: true, managementCompany: { select: { id: true, name: true } } },
  },
  jobTypeId: true,
  jobType: { select: { id: true, name: true } },
  templateId: true,
  warehouseId: true,
  warehouse: { select: { name: true } },
  unitNumber: true,
  unitType: true,
  statusId: true,
  status: { select: { id: true, name: true } },
  vacancy: true,
  timeOfDay: true,
  scheduledFor: true,
  description: true,
  createdAt: true,
  updatedAt: true,
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
  propertyId: true,
  property: {
    select: {
      name: true,
      managementCompany: { select: { id: true, name: true } },
      streetAddress: true,
      city: true,
      state: true,
      postalCode: true,
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
  statusId: true,
  status: { select: { id: true, name: true } },
  vacancy: true,
  timeOfDay: true,
  scheduledFor: true,
  description: true,
  customAddress: true,
  internalNotes: true,
  installerInstructions: true,
  createdAt: true,
  updatedAt: true,
} as const

export type WorkOrderListPayload = Prisma.FlooringWorkOrderGetPayload<{ select: typeof workOrderListSelect }>
export type WorkOrderDetailPayload = Prisma.FlooringWorkOrderGetPayload<{ select: typeof workOrderDetailSelect }>
