import type { Prisma, PrismaClient } from "@prisma/client"

export type InventoryDbClient = PrismaClient | Prisma.TransactionClient

export const inventoryRowSelect = {
  id: true,
  importEntryId: true,
  productId: true,
  itemNumber: true,
  dyeLot: true,
  warehouseId: true,
  locationId: true,
  stockCount: true,
  isImported: true,
  cost: true,
  freight: true,
  notes: true,
  fifoReceivedAt: true,
  createdAt: true,
  updatedAt: true,
  importEntry: {
    select: {
      id: true,
      importNumber: true,
      warehouseId: true,
      warehouse: { select: { id: true, name: true, number: true } },
    },
  },
  product: {
    select: {
      id: true,
      name: true,
      style: true,
      color: true,
      coveragePerUnit: true,
      category: {
        select: {
          id: true,
          name: true,
          stockUnit: { select: { name: true, abbreviation: true } },
          sendUnit: { select: { name: true, abbreviation: true } },
        },
      },
    },
  },
  warehouse: { select: { id: true, name: true, number: true } },
  location: {
    select: {
      id: true,
      rafter: true,
      level: true,
      warehouseId: true,
      section: { select: { id: true, number: true } },
      warehouse: { select: { id: true, name: true, number: true } },
    },
  },
  _count: { select: { cutLogs: true } },
} as const satisfies Prisma.FlooringInventorySelect

export const cutLogRowSelect = {
  id: true,
  inventoryId: true,
  workOrderId: true,
  workOrderItemId: true,
  before: true,
  cut: true,
  after: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.FlooringCutLogSelect

export const inventoryDetailSelect = {
  ...inventoryRowSelect,
  cutLogs: {
    select: cutLogRowSelect,
    orderBy: [{ createdAt: "asc" }],
  },
} as const satisfies Prisma.FlooringInventorySelect

export type InventoryRowPayload = Prisma.FlooringInventoryGetPayload<{
  select: typeof inventoryRowSelect
}>
export type InventoryDetailPayload = Prisma.FlooringInventoryGetPayload<{
  select: typeof inventoryDetailSelect
}>
export type CutLogRowPayload = Prisma.FlooringCutLogGetPayload<{
  select: typeof cutLogRowSelect
}>
