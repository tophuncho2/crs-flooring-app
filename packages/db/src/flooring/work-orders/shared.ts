import type { Prisma, PrismaClient } from "@prisma/client"

export type WorkOrdersDbClient = PrismaClient | Prisma.TransactionClient

export const workOrderRowSelect = {
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
  vacancy: true,
  scheduledFor: true,
  createdAt: true,
  updatedAt: true,
} as const

export const workOrderDetailSelect = {
  ...workOrderRowSelect,
  customAddress: true,
  description: true,
  instructions: true,
  propertyInstructions: true,
  notes: true,
} as const

export type WorkOrderRowPayload = Prisma.FlooringWorkOrderGetPayload<{ select: typeof workOrderRowSelect }>
export type WorkOrderDetailPayload = Prisma.FlooringWorkOrderGetPayload<{ select: typeof workOrderDetailSelect }>
