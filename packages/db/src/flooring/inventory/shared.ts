import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { enrichedInventoryAdjustmentRowSelect } from "./adjustments/shared.js"

export type InventoryDbClient = PrismaClient | Prisma.TransactionClient

export const inventoryRowSelect = {
  id: true,
  inventoryNumber: true,
  importEntryId: true,
  importEntry: { select: { importNumber: true, purchaseOrderNumber: true } },
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
  warehouse: { select: { id: true, name: true } },
  location: true,
  startingStock: true,
  cost: true,
  freight: true,
  netDeducted: true,
  isArchived: true,
  wasMerged: true,
  note: true,
  internalNotes: true,
  color: true,
  _count: { select: { inventoryAdjustments: true } },
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} as const satisfies Prisma.FlooringInventorySelect

export const inventoryDetailSelect = {
  ...inventoryRowSelect,
  // The numeric sort key (generated column) — read here so the detail loader can
  // resolve the adjacent rows for the record-view shell stepper.
  inventoryNumberInt: true,
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
