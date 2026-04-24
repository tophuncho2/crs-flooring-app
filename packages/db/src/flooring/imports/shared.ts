import type { Prisma, PrismaClient } from "@prisma/client"

export type ImportsDbClient = PrismaClient | Prisma.TransactionClient

export const importRowSelect = {
  id: true,
  importNumber: true,
  orderNumber: true,
  tag: true,
  percent: true,
  notes: true,
  warehouseId: true,
  warehouse: { select: { id: true, name: true, number: true } },
  manufacturerId: true,
  manufacturer: { select: { id: true, companyName: true } },
  _count: { select: { stagedInventoryRows: true, inventories: true } },
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.FlooringImportEntrySelect

export const importDetailSelect = {
  ...importRowSelect,
  stagedInventoryRows: { select: { id: true } },
  inventories: { select: { id: true } },
} as const satisfies Prisma.FlooringImportEntrySelect

export type ImportRowPayload = Prisma.FlooringImportEntryGetPayload<{ select: typeof importRowSelect }>
export type ImportDetailPayload = Prisma.FlooringImportEntryGetPayload<{
  select: typeof importDetailSelect
}>
