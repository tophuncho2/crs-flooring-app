import type { Prisma, PrismaClient } from "@prisma/client"

export type InventoryDbClient = PrismaClient | Prisma.TransactionClient

export const inventoryRowSelect = {
  id: true,
  importEntryId: true,
  importEntry: {
    select: {
      id: true,
      importNumber: true,
      warehouseId: true,
      warehouse: { select: { id: true, name: true, number: true } },
    },
  },
  productId: true,
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
          slug: true,
          name: true,
          stockUnit: { select: { name: true, abbreviation: true } },
          sendUnit: { select: { name: true, abbreviation: true } },
        },
      },
    },
  },
  itemNumber: true,
  dyeLot: true,
  warehouseId: true,
  warehouse: { select: { id: true, name: true, number: true } },
  locationId: true,
  location: {
    select: {
      id: true,
      rafter: true,
      level: true,
      section: { select: { id: true, number: true } },
      warehouse: { select: { id: true, name: true, number: true } },
    },
  },
  startingStock: true,
  totalCutSum: true,
  cost: true,
  freight: true,
  costPerUnit: true,
  freightPerUnit: true,
  coveragePerUnit: true,
  isArchived: true,
  notes: true,
  fifoReceivedAt: true,
  _count: { select: { cutLogs: true } },
  createdAt: true,
  updatedAt: true,
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
  cost: true,
  freight: true,
  isWaste: true,
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
