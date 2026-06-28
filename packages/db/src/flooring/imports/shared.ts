import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"

export type ImportsDbClient = PrismaClient | Prisma.TransactionClient

export const importRowSelect = {
  id: true,
  importNumber: true,
  purchaseOrderNumber: true,
  internalNotes: true,
  warehouseId: true,
  warehouse: { select: { id: true, name: true } },
  manufacturerId: true,
  manufacturer: { select: { id: true, companyName: true } },
  entityId: true,
  entity: { select: { id: true, entity: true } },
  color: true,
  _count: { select: { stagedInventoryRows: true, inventories: true } },
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
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
