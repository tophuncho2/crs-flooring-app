import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { enrichedInventoryAdjustmentRowSelect } from "./adjustments/shared.js"

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
      category: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  },
  categorySlug: true,
  categoryName: true,
  stockUnitName: true,
  stockUnitAbbrev: true,
  sendUnitName: true,
  sendUnitAbbrev: true,
  rollPrefix: true,
  rollNumber: true,
  dyeLot: true,
  warehouseId: true,
  warehouse: { select: { id: true, name: true, number: true } },
  location: true,
  startingStock: true,
  netDeducted: true,
  isArchived: true,
  note: true,
  internalNotes: true,
  inventoryItem: true,
  fifoReceivedAt: true,
  _count: { select: { inventoryAdjustments: true } },
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.FlooringInventorySelect

export const inventoryDetailSelect = {
  ...inventoryRowSelect,
  inventoryAdjustments: {
    select: enrichedInventoryAdjustmentRowSelect,
    orderBy: [{ createdAt: "asc" }],
  },
} as const satisfies Prisma.FlooringInventorySelect

export type InventoryRowPayload = Prisma.FlooringInventoryGetPayload<{
  select: typeof inventoryRowSelect
}>
export type InventoryDetailPayload = Prisma.FlooringInventoryGetPayload<{
  select: typeof inventoryDetailSelect
}>
