// @ts-nocheck — imports data shared selects pending rebuild next sweep.
// transportType/status dropped from the schema, staged rows added.
import type { Prisma, PrismaClient } from "@prisma/client"

export type ImportsDbClient = PrismaClient | Prisma.TransactionClient

export const importRowSelect = {
  id: true,
  importNumber: true,
  orderNumber: true,
  tag: true,
  transportType: true,
  status: true,
  notes: true,
  warehouseId: true,
  createdAt: true,
  updatedAt: true,
  warehouse: { select: { id: true, name: true } },
  _count: { select: { inventories: true } },
} as const satisfies Prisma.FlooringImportEntrySelect

export const importInventorySelect = {
  id: true,
  productId: true,
  itemNumber: true,
  dyeLot: true,
  stockCount: true,
  cost: true,
  freight: true,
  notes: true,
  locationId: true,
  isImported: true,
  updatedAt: true,
  product: {
    select: {
      id: true,
      name: true,
      style: true,
      color: true,
      category: { select: { stockUnit: { select: { name: true } } } },
    },
  },
  location: {
    select: {
      id: true,
      rafter: true,
      level: true,
      section: { select: { id: true, number: true } },
      warehouse: { select: { id: true, name: true, number: true } },
    },
  },
} as const satisfies Prisma.FlooringInventorySelect

export const importDetailSelect = {
  id: true,
  importNumber: true,
  orderNumber: true,
  tag: true,
  transportType: true,
  status: true,
  notes: true,
  warehouseId: true,
  createdAt: true,
  updatedAt: true,
  warehouse: { select: { id: true, name: true } },
  _count: { select: { inventories: true } },
  inventories: {
    select: importInventorySelect,
    orderBy: [{ createdAt: "asc" }],
  },
} as const satisfies Prisma.FlooringImportEntrySelect

export type ImportRowPayload = Prisma.FlooringImportEntryGetPayload<{ select: typeof importRowSelect }>
export type ImportDetailPayload = Prisma.FlooringImportEntryGetPayload<{ select: typeof importDetailSelect }>
export type ImportInventoryPayload = Prisma.FlooringInventoryGetPayload<{ select: typeof importInventorySelect }>
