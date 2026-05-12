import type { Prisma, PrismaClient } from "@prisma/client"

export type CutLogDbClient = PrismaClient | Prisma.TransactionClient

export const cutLogRowSelect = {
  id: true,
  cutLogNumber: true,
  inventoryId: true,
  inventoryItem: true,
  inventoryNumber: true,
  rollPrefix: true,
  rollNumber: true,
  dyeLot: true,
  inventoryNote: true,
  location: true,
  categorySlug: true,
  workOrderId: true,
  workOrderItemId: true,
  before: true,
  cut: true,
  coverageCut: true,
  after: true,
  stockUnitName: true,
  stockUnitAbbrev: true,
  itemCoverageUnitName: true,
  itemCoverageUnitAbbrev: true,
  status: true,
  isFinal: true,
  finalCutSequence: true,
  isWaste: true,
  void: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.FlooringCutLogSelect

export type CutLogRowPayload = Prisma.FlooringCutLogGetPayload<{
  select: typeof cutLogRowSelect
}>

/**
 * Inventory-side cut-log read shape: `cutLogRowSelect` plus the linked
 * work-order's `workOrderNumber` and the linked work-order item's product
 * name parts. Used only by `inventoryDetailSelect` so the inventory side
 * can render labels in the cut-log row + side panel without a follow-up
 * fetch. The work-orders side still uses plain `cutLogRowSelect`.
 */
export const inventoryCutLogRowSelect = {
  ...cutLogRowSelect,
  workOrder: {
    select: {
      workOrderNumber: true,
    },
  },
  workOrderItem: {
    select: {
      product: {
        select: {
          name: true,
          style: true,
          color: true,
        },
      },
    },
  },
} as const satisfies Prisma.FlooringCutLogSelect

export type InventoryCutLogRowPayload = Prisma.FlooringCutLogGetPayload<{
  select: typeof inventoryCutLogRowSelect
}>
