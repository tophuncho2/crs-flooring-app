import type { Prisma, PrismaClient } from "@prisma/client"

export type CutLogDbClient = PrismaClient | Prisma.TransactionClient

export const cutLogRowSelect = {
  id: true,
  inventoryId: true,
  workOrderId: true,
  workOrderItemId: true,
  before: true,
  cut: true,
  coverageCut: true,
  after: true,
  status: true,
  cost: true,
  freight: true,
  isWaste: true,
  void: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.FlooringCutLogSelect

export type CutLogRowPayload = Prisma.FlooringCutLogGetPayload<{
  select: typeof cutLogRowSelect
}>
