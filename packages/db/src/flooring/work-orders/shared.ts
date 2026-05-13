import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"

export type WorkOrdersDbClient = PrismaClient | Prisma.TransactionClient

/**
 * List-view select. Excludes detail-only columns (instructions, notes,
 * customAddress, sync snapshots, items, files) and uses the lightweight
 * `property: { name }` join because list rows do not display the full
 * address. Surfaces `status`, `description`, `scheduledFor` so the list
 * grid can render badges + sortable columns.
 */
export const workOrderListSelect = {
  id: true,
  workOrderNumber: true,
  propertyId: true,
  property: { select: { name: true } },
  managementCompanyId: true,
  managementCompany: { select: { id: true, name: true } },
  jobTypeId: true,
  jobType: { select: { id: true, name: true } },
  templateId: true,
  template: { select: { templateNumber: true } },
  warehouseId: true,
  warehouse: { select: { name: true } },
  unitNumber: true,
  unitType: true,
  isComplete: true,
  status: true,
  vacancy: true,
  scheduledFor: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const

/**
 * Detail select used by the record view. Pulls the joined property
 * shape the rewritten WorkOrderDetail normalizer expects (full address
 * + live `instructions` for the read-only lookup cell). Includes the
 * read-only sync snapshot columns (worker-controlled).
 */
export const workOrderDetailSelect = {
  id: true,
  workOrderNumber: true,
  propertyId: true,
  property: {
    select: {
      name: true,
      streetAddress: true,
      city: true,
      state: true,
      postalCode: true,
      instructions: true,
    },
  },
  managementCompanyId: true,
  managementCompany: { select: { id: true, name: true } },
  jobTypeId: true,
  jobType: { select: { id: true, name: true } },
  templateId: true,
  template: { select: { templateNumber: true } },
  warehouseId: true,
  warehouse: { select: { name: true } },
  unitNumber: true,
  unitType: true,
  isComplete: true,
  status: true,
  vacancy: true,
  scheduledFor: true,
  description: true,
  customAddress: true,
  instructions: true,
  notes: true,
  templateSyncedAt: true,
  templateSyncMode: true,
  templateSnapshotHash: true,
  createdAt: true,
  updatedAt: true,
} as const

export type WorkOrderListPayload = Prisma.FlooringWorkOrderGetPayload<{ select: typeof workOrderListSelect }>
export type WorkOrderDetailPayload = Prisma.FlooringWorkOrderGetPayload<{ select: typeof workOrderDetailSelect }>
