import type { Prisma, PrismaClient } from "@prisma/client"
import { inventoryCutLogRowSelect } from "./cut-logs/shared.js"

export type InventoryDbClient = PrismaClient | Prisma.TransactionClient

export const inventoryRowSelect = {
  id: true,
  inventoryNumber: true,
  importEntryId: true,
  importNumber: true,
  purchaseOrderNumber: true,
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
        },
      },
    },
  },
  productName: true,
  categorySlug: true,
  categoryName: true,
  stockUnitName: true,
  stockUnitAbbrev: true,
  itemCoverageUnitName: true,
  itemCoverageUnitAbbrev: true,
  sendUnitName: true,
  sendUnitAbbrev: true,
  rollNumber: true,
  dyeLot: true,
  warehouseId: true,
  warehouse: { select: { id: true, name: true, number: true } },
  location: true,
  startingStock: true,
  totalCutSum: true,
  coveragePerUnit: true,
  isArchived: true,
  note: true,
  internalNotes: true,
  inventoryItem: true,
  fifoReceivedAt: true,
  _count: { select: { cutLogs: true } },
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.FlooringInventorySelect

export const inventoryDetailSelect = {
  ...inventoryRowSelect,
  cutLogs: {
    select: inventoryCutLogRowSelect,
    orderBy: [{ createdAt: "asc" }],
  },
} as const satisfies Prisma.FlooringInventorySelect

export type InventoryRowPayload = Prisma.FlooringInventoryGetPayload<{
  select: typeof inventoryRowSelect
}>
export type InventoryDetailPayload = Prisma.FlooringInventoryGetPayload<{
  select: typeof inventoryDetailSelect
}>
